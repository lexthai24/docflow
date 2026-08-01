"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { audit, AUDIT } from "@/lib/audit";
import { toErrorResponse } from "@/lib/errors";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";
import {
  CreateFolderSchema,
  UpdateFolderSchema,
  MoveFolderSchema,
} from "@/lib/validations/folder";
import {
  assertNoDuplicateName,
  buildFolderPath,
  isDescendant,
} from "@/lib/services/folders";

export async function createFolderAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission(PERMISSIONS.FOLDER_CREATE);
    const parsed = CreateFolderSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    }
    const { name, parentId, description, color, icon, departmentId } = parsed.data;

    // ตรวจ parent อยู่ในองค์กรเดียวกัน
    if (parentId) {
      const parent = await db.folder.findFirst({
        where: { id: parentId, organizationId: user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) return actionError("ไม่พบโฟลเดอร์ต้นทาง");
    }

    await assertNoDuplicateName(user.organizationId, parentId ?? null, name);
    const path = await buildFolderPath(user.organizationId, parentId ?? null);

    const folder = await db.folder.create({
      data: {
        organizationId: user.organizationId,
        name,
        description: description ?? null,
        color: color ?? null,
        icon: icon ?? null,
        parentId: parentId ?? null,
        departmentId: departmentId ?? user.departmentId ?? null,
        ownerId: user.id,
        path,
      },
      select: { id: true },
    });

    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.FOLDER_CREATED,
      entityType: "Folder",
      entityId: folder.id,
      newValues: { name },
    });

    revalidatePath("/folders");
    return actionOk({ id: folder.id });
  } catch (e) {
    const r = toErrorResponse(e);
    return actionError(r.message);
  }
}

export async function updateFolderAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.FOLDER_UPDATE);
    const parsed = UpdateFolderSchema.safeParse(input);
    if (!parsed.success) {
      return actionError("ข้อมูลไม่ถูกต้อง", parsed.error.flatten().fieldErrors);
    }
    const { id, name, description, color, icon } = parsed.data;

    const existing = await db.folder.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, parentId: true, name: true },
    });
    if (!existing) return actionError("ไม่พบโฟลเดอร์");

    if (name !== existing.name) {
      await assertNoDuplicateName(user.organizationId, existing.parentId, name, id);
    }

    await db.folder.update({
      where: { id },
      data: { name, description: description ?? null, color: color ?? null, icon: icon ?? null },
    });

    revalidatePath("/folders");
    revalidatePath(`/folders/${id}`);
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function moveFolderAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.FOLDER_UPDATE);
    const parsed = MoveFolderSchema.safeParse(input);
    if (!parsed.success) return actionError("ข้อมูลไม่ถูกต้อง");
    const { id, targetParentId } = parsed.data;

    const folder = await db.folder.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!folder) return actionError("ไม่พบโฟลเดอร์");

    // กัน circular: ห้ามย้ายเข้าตัวเองหรือลูกหลานตัวเอง (สเปคหมวด 7)
    if (targetParentId) {
      const target = await db.folder.findFirst({
        where: { id: targetParentId, organizationId: user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!target) return actionError("ไม่พบโฟลเดอร์ปลายทาง");
      if (await isDescendant(user.organizationId, id, targetParentId)) {
        return actionError("ไม่สามารถย้ายโฟลเดอร์เข้าไปในโฟลเดอร์ย่อยของตัวเองได้");
      }
    }

    await assertNoDuplicateName(user.organizationId, targetParentId ?? null, folder.name, id);
    const newPath = await buildFolderPath(user.organizationId, targetParentId ?? null);

    await db.folder.update({
      where: { id },
      data: { parentId: targetParentId ?? null, path: newPath },
    });

    revalidatePath("/folders");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function deleteFolderAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.FOLDER_DELETE);
    const folder = await db.folder.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, name: true, _count: { select: { documents: true, children: true } } },
    });
    if (!folder) return actionError("ไม่พบโฟลเดอร์");

    // Soft delete โฟลเดอร์ + ลูกทั้งหมด (สเปคหมวด 21)
    // descendant มี path ที่มี "/{id}/" อยู่ (materialized path)
    const now = new Date();
    await db.folder.updateMany({
      where: {
        organizationId: user.organizationId,
        deletedAt: null,
        OR: [{ id }, { path: { contains: `/${id}/` } }],
      },
      data: { deletedAt: now },
    });

    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.DOCUMENT_DELETED,
      entityType: "Folder",
      entityId: id,
      metadata: { name: folder.name },
    });

    revalidatePath("/folders");
    revalidatePath("/trash");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}
