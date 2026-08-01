import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { WorkflowError, AuthorizationError } from "@/lib/errors";
import { canTransition, STATUS_LABELS, type DocStatus as Status } from "@/lib/workflow-rules";

// Workflow state machine (สเปคหมวด 15)
// ห้ามให้ client เปลี่ยน status ตรงๆ — ทุก transition ผ่าน service นี้ฝั่ง server
// กฎ transition (pure) อยู่ใน lib/workflow-rules.ts เพื่อทดสอบแยกได้

export { canTransition };

export function assertTransition(from: Status, to: Status): void {
  if (!canTransition(from, to)) {
    throw new WorkflowError(
      `ไม่สามารถเปลี่ยนสถานะเอกสารจาก ${STATUS_LABELS[from]} เป็น ${STATUS_LABELS[to]} ได้`,
    );
  }
}

/** หา assignee จาก step definition (subjectType/subjectId) → user ids */
async function resolveStepAssignees(
  organizationId: string,
  assignees: { subjectType: string; subjectId: string }[],
): Promise<string[]> {
  const ids = new Set<string>();
  for (const a of assignees) {
    if (a.subjectType === "USER") {
      ids.add(a.subjectId);
    } else if (a.subjectType === "ROLE") {
      const users = await db.user.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          userRoles: { some: { role: { key: a.subjectId } } },
        },
        select: { id: true },
      });
      users.forEach((u) => ids.add(u.id));
    } else if (a.subjectType === "DEPARTMENT") {
      const users = await db.user.findMany({
        where: { organizationId, departmentId: a.subjectId, status: "ACTIVE" },
        select: { id: true },
      });
      users.forEach((u) => ids.add(u.id));
    }
  }
  return Array.from(ids);
}

/** ส่งเอกสารเข้าตรวจสอบ: DRAFT/CHANGES_REQUESTED → IN_REVIEW + สร้าง workflow instance */
export async function submitForReview(
  user: CurrentUser,
  documentId: string,
): Promise<void> {
  const doc = await db.document.findFirst({
    where: { id: documentId, organizationId: user.organizationId, deletedAt: null },
    select: { id: true, status: true, ownerId: true, categoryId: true, title: true },
  });
  if (!doc) throw new WorkflowError("ไม่พบเอกสาร");

  // เฉพาะ owner หรือผู้มีสิทธิ์ update
  if (doc.ownerId !== user.id && !hasPermission(user, PERMISSIONS.DOCUMENT_UPDATE)) {
    throw new AuthorizationError("คุณไม่มีสิทธิ์ส่งเอกสารนี้เข้าตรวจสอบ");
  }

  assertTransition(doc.status as Status, "IN_REVIEW");

  // หา workflow template จาก category (ถ้ามี)
  const category = doc.categoryId
    ? await db.category.findUnique({
        where: { id: doc.categoryId },
        select: { defaultWorkflowId: true },
      })
    : null;

  const template = category?.defaultWorkflowId
    ? await db.workflowTemplate.findUnique({
        where: { id: category.defaultWorkflowId },
        include: { steps: { orderBy: { order: "asc" } } },
      })
    : null;

  await db.$transaction(async (tx) => {
    await tx.document.update({ where: { id: documentId }, data: { status: "IN_REVIEW" } });

    const instance = await tx.workflowInstance.create({
      data: {
        documentId,
        templateId: template?.id ?? null,
        status: "IN_PROGRESS",
        currentStepOrder: template?.steps[0]?.order ?? 1,
        startedById: user.id,
      },
      select: { id: true },
    });

    // สร้าง assignment สำหรับ step แรก (REVIEW)
    const firstStep = template?.steps[0];
    if (firstStep) {
      const assigneeIds = await resolveStepAssignees(
        user.organizationId,
        firstStep.assignees as { subjectType: string; subjectId: string }[],
      );
      const dueAt = firstStep.dueInDays
        ? new Date(Date.now() + firstStep.dueInDays * 24 * 3600 * 1000)
        : null;
      if (assigneeIds.length > 0) {
        await tx.workflowAssignment.createMany({
          data: assigneeIds.map((assigneeId) => ({
            instanceId: instance.id,
            stepOrder: firstStep.order,
            stepType: firstStep.type,
            assigneeId,
            dueAt,
          })),
        });
        // แจ้งเตือนผู้ตรวจสอบ
        await tx.notification.createMany({
          data: assigneeIds.map((recipientId) => ({
            organizationId: user.organizationId,
            recipientId,
            type: "REVIEW_REQUESTED" as const,
            title: "มีเอกสารรอตรวจสอบ",
            body: doc.title,
            link: `/documents/${documentId}`,
          })),
        });
      }
    }
  });
}

export interface DecisionInput {
  documentId: string;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  reason?: string;
}

/**
 * บันทึกการตัดสินใจของ reviewer/approver
 * ตรวจสอบ: ผู้ตัดสินถูก assign, มี permission, reason ครบ (ถ้าจำเป็น)
 */
export async function recordDecision(user: CurrentUser, input: DecisionInput): Promise<void> {
  const { documentId, decision, reason } = input;

  const doc = await db.document.findFirst({
    where: { id: documentId, organizationId: user.organizationId, deletedAt: null },
    select: { id: true, status: true, title: true, ownerId: true },
  });
  if (!doc) throw new WorkflowError("ไม่พบเอกสาร");

  const instance = await db.workflowInstance.findFirst({
    where: { documentId, status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" },
    include: {
      assignments: { where: { completed: false } },
      template: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });
  if (!instance) throw new WorkflowError("ไม่พบ workflow ที่กำลังดำเนินการ");

  // ผู้ตัดสินต้องถูก assign ใน step ปัจจุบัน (สเปคหมวด 32: approve เฉพาะที่ถูก assign)
  const myAssignment = instance.assignments.find(
    (a) => a.assigneeId === user.id && a.stepOrder === instance.currentStepOrder,
  );
  if (!myAssignment) {
    throw new AuthorizationError("คุณไม่ได้รับมอบหมายให้ดำเนินการเอกสารนี้ในขั้นตอนนี้");
  }

  // ตรวจ permission ตามชนิด step
  const stepType = myAssignment.stepType;
  if (stepType === "REVIEW" && !hasPermission(user, PERMISSIONS.DOCUMENT_REVIEW)) {
    throw new AuthorizationError("คุณไม่มีสิทธิ์ตรวจสอบเอกสาร");
  }
  if (stepType === "APPROVAL") {
    if (decision === "APPROVED" && !hasPermission(user, PERMISSIONS.DOCUMENT_APPROVE)) {
      throw new AuthorizationError("คุณไม่มีสิทธิ์อนุมัติเอกสาร");
    }
    if (decision === "REJECTED" && !hasPermission(user, PERMISSIONS.DOCUMENT_REJECT)) {
      throw new AuthorizationError("คุณไม่มีสิทธิ์ปฏิเสธเอกสาร");
    }
  }

  // reject/changes ต้องมีเหตุผล (สเปคหมวด 32)
  if ((decision === "REJECTED" || decision === "CHANGES_REQUESTED") && !reason?.trim()) {
    throw new WorkflowError("กรุณาระบุเหตุผลสำหรับการปฏิเสธหรือขอแก้ไข");
  }

  const currentStep = instance.template?.steps.find((s) => s.order === instance.currentStepOrder);
  const mode = currentStep?.mode ?? "SEQUENTIAL";

  await db.$transaction(async (tx) => {
    await tx.approvalDecision.create({
      data: {
        instanceId: instance.id,
        stepOrder: instance.currentStepOrder,
        deciderId: user.id,
        decision,
        reason: reason?.trim() || null,
      },
    });
    await tx.workflowAssignment.update({
      where: { id: myAssignment.id },
      data: { completed: true },
    });

    // ── CHANGES_REQUESTED / REJECTED: จบ workflow ──
    if (decision === "CHANGES_REQUESTED") {
      await tx.document.update({ where: { id: documentId }, data: { status: "CHANGES_REQUESTED" } });
      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { status: "CHANGES_REQUESTED", completedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          organizationId: user.organizationId,
          recipientId: doc.ownerId,
          type: "CHANGES_REQUESTED",
          title: "มีการขอแก้ไขเอกสาร",
          body: `${doc.title}: ${reason}`,
          link: `/documents/${documentId}`,
        },
      });
      return;
    }

    if (decision === "REJECTED") {
      await tx.document.update({ where: { id: documentId }, data: { status: "REJECTED" } });
      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { status: "REJECTED", completedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          organizationId: user.organizationId,
          recipientId: doc.ownerId,
          type: "DOCUMENT_REJECTED",
          title: "เอกสารถูกปฏิเสธ",
          body: `${doc.title}: ${reason}`,
          link: `/documents/${documentId}`,
        },
      });
      return;
    }

    // ── APPROVED ──
    // parallel-all: ต้องรอ assignee อื่นใน step เดียวกันก่อน
    const remainingInStep = await tx.workflowAssignment.count({
      where: { instanceId: instance.id, stepOrder: instance.currentStepOrder, completed: false },
    });

    if (mode === "PARALLEL_ALL" && remainingInStep > 0) {
      return; // ยังรอคนอื่น
    }

    // ไป step ถัดไป หรือจบ workflow
    const nextStep = instance.template?.steps.find((s) => s.order > instance.currentStepOrder);

    if (nextStep) {
      // review เสร็จ → เข้า pending approval
      const newDocStatus = nextStep.type === "APPROVAL" ? "PENDING_APPROVAL" : "IN_REVIEW";
      await tx.document.update({ where: { id: documentId }, data: { status: newDocStatus } });
      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { currentStepOrder: nextStep.order },
      });
      const assigneeIds = await resolveStepAssignees(
        user.organizationId,
        nextStep.assignees as { subjectType: string; subjectId: string }[],
      );
      const dueAt = nextStep.dueInDays
        ? new Date(Date.now() + nextStep.dueInDays * 24 * 3600 * 1000)
        : null;
      if (assigneeIds.length > 0) {
        await tx.workflowAssignment.createMany({
          data: assigneeIds.map((assigneeId) => ({
            instanceId: instance.id,
            stepOrder: nextStep.order,
            stepType: nextStep.type,
            assigneeId,
            dueAt,
          })),
        });
        await tx.notification.createMany({
          data: assigneeIds.map((recipientId) => ({
            organizationId: user.organizationId,
            recipientId,
            type: nextStep.type === "APPROVAL" ? ("APPROVAL_REQUESTED" as const) : ("REVIEW_REQUESTED" as const),
            title: nextStep.type === "APPROVAL" ? "มีเอกสารรออนุมัติ" : "มีเอกสารรอตรวจสอบ",
            body: doc.title,
            link: `/documents/${documentId}`,
          })),
        });
      }
    } else {
      // ไม่มี step ถัดไป → อนุมัติสมบูรณ์
      await tx.document.update({ where: { id: documentId }, data: { status: "APPROVED" } });
      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: { status: "APPROVED", completedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          organizationId: user.organizationId,
          recipientId: doc.ownerId,
          type: "DOCUMENT_APPROVED",
          title: "เอกสารได้รับการอนุมัติ",
          body: doc.title,
          link: `/documents/${documentId}`,
        },
      });
    }
  });
}

export function getWorkflowInstanceInclude(): Prisma.WorkflowInstanceInclude {
  return {
    decisions: {
      orderBy: { createdAt: "desc" },
      include: { decider: { select: { firstName: true, lastName: true } } },
    },
    assignments: { include: { assignee: { select: { firstName: true, lastName: true } } } },
  };
}
