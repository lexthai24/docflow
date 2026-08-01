"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAuthenticated, requirePermission } from "@/lib/auth/dal";
import { canAccessDocument } from "@/lib/auth/access-control";
import { PERMISSIONS } from "@/lib/permissions";
import { audit, AUDIT } from "@/lib/audit";
import { toErrorResponse } from "@/lib/errors";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";
import { submitForReview, recordDecision } from "@/lib/services/workflow";

export async function toggleFavoriteAction(documentId: string): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const user = await assertAuthenticated();
    if (!(await canAccessDocument(user, documentId, "VIEW"))) {
      return actionError("คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้");
    }
    const existing = await db.favorite.findUnique({
      where: { userId_documentId: { userId: user.id, documentId } },
      select: { id: true },
    });
    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } });
      revalidatePath(`/documents/${documentId}`);
      revalidatePath("/favorites");
      return actionOk({ favorited: false });
    }
    await db.favorite.create({ data: { userId: user.id, documentId } });
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/favorites");
    return actionOk({ favorited: true });
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function submitForReviewAction(documentId: string): Promise<ActionResult> {
  try {
    const user = await assertAuthenticated();
    await submitForReview(user, documentId);
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.WORKFLOW_SUBMITTED,
      entityType: "Document",
      entityId: documentId,
    });
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/review");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function decisionAction(input: {
  documentId: string;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  reason?: string;
}): Promise<ActionResult> {
  try {
    const user = await assertAuthenticated();
    await recordDecision(user, input);
    const auditAction =
      input.decision === "APPROVED"
        ? AUDIT.WORKFLOW_APPROVED
        : input.decision === "REJECTED"
          ? AUDIT.WORKFLOW_REJECTED
          : AUDIT.WORKFLOW_CHANGES_REQUESTED;
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: auditAction,
      entityType: "Document",
      entityId: input.documentId,
      metadata: input.reason ? { reason: input.reason } : {},
    });
    revalidatePath(`/documents/${input.documentId}`);
    revalidatePath("/review");
    revalidatePath("/approvals");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function archiveDocumentAction(documentId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.DOCUMENT_ARCHIVE);
    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, status: true, legalHold: true },
    });
    if (!doc) return actionError("ไม่พบเอกสาร");

    await db.document.update({
      where: { id: documentId },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.DOCUMENT_ARCHIVED,
      entityType: "Document",
      entityId: documentId,
    });
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/documents");
    revalidatePath("/archive");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.DOCUMENT_DELETE);
    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, legalHold: true, title: true },
    });
    if (!doc) return actionError("ไม่พบเอกสาร");
    // ห้ามลบเอกสารที่ติด legal hold (สเปคหมวด 20)
    if (doc.legalHold) {
      return actionError("เอกสารนี้ติด Legal Hold ไม่สามารถลบได้");
    }

    // Soft delete (สเปคหมวด 21)
    await db.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.DOCUMENT_DELETED,
      entityType: "Document",
      entityId: documentId,
      metadata: { title: doc.title },
    });
    revalidatePath("/documents");
    revalidatePath("/trash");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function restoreVersionAction(input: {
  documentId: string;
  versionId: string;
}): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.DOCUMENT_VERSION_RESTORE);
    const { documentId, versionId } = input;

    if (!(await canAccessDocument(user, documentId, "UPLOAD_VERSION"))) {
      return actionError("คุณไม่มีสิทธิ์จัดการเวอร์ชันของเอกสารนี้");
    }

    const source = await db.documentVersion.findFirst({
      where: { id: versionId, documentId },
    });
    if (!source) return actionError("ไม่พบเวอร์ชันที่ต้องการกู้คืน");

    // สร้าง version ใหม่จากเวอร์ชันเก่า (ไม่เขียนทับ — สเปคหมวด 11)
    await db.$transaction(async (tx) => {
      const max = await tx.documentVersion.aggregate({
        where: { documentId },
        _max: { versionNumber: true },
      });
      const nextNum = (max._max.versionNumber ?? 0) + 1;

      await tx.documentVersion.updateMany({ where: { documentId }, data: { isCurrent: false } });
      const newVer = await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextNum,
          storageProvider: source.storageProvider,
          storageKey: source.storageKey, // ชี้ไฟล์เดิม (immutable)
          originalFilename: source.originalFilename,
          storedFilename: source.storedFilename,
          mimeType: source.mimeType,
          extension: source.extension,
          fileSize: source.fileSize,
          checksum: source.checksum,
          changeNote: `กู้คืนจากเวอร์ชัน ${source.versionNumber}`,
          isCurrent: true,
          createdById: user.id,
        },
        select: { id: true },
      });
      await tx.document.update({
        where: { id: documentId },
        data: { currentVersionId: newVer.id },
      });
    });

    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.VERSION_RESTORED,
      entityType: "Document",
      entityId: documentId,
      metadata: { restoredFrom: source.versionNumber },
    });
    revalidatePath(`/documents/${documentId}`);
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function addCommentAction(input: {
  documentId: string;
  body: string;
  parentId?: string;
  isInternal?: boolean;
}): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.COMMENT_CREATE);
    const { documentId, body, parentId, isInternal } = input;

    if (!body?.trim()) return actionError("กรุณากรอกความคิดเห็น");
    if (!(await canAccessDocument(user, documentId, "COMMENT"))) {
      return actionError("คุณไม่มีสิทธิ์แสดงความคิดเห็นในเอกสารนี้");
    }

    await db.comment.create({
      data: {
        documentId,
        authorId: user.id,
        parentId: parentId ?? null,
        body: body.trim(),
        isInternal: Boolean(isInternal),
      },
    });
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.COMMENT_CREATED,
      entityType: "Document",
      entityId: documentId,
    });
    revalidatePath(`/documents/${documentId}`);
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}
