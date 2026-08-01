"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { audit, AUDIT } from "@/lib/audit";
import { getStorage } from "@/lib/storage";
import { toErrorResponse } from "@/lib/errors";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function restoreDocumentAction(documentId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission(PERMISSIONS.DOCUMENT_RESTORE);
    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId: user.organizationId, deletedAt: { not: null } },
      select: { id: true, title: true },
    });
    if (!doc) return actionError("ไม่พบเอกสารในถังขยะ");

    await db.document.update({ where: { id: documentId }, data: { deletedAt: null } });
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.DOCUMENT_RESTORED,
      entityType: "Document",
      entityId: documentId,
      metadata: { title: doc.title },
    });
    revalidatePath("/trash");
    revalidatePath("/documents");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}

export async function permanentDeleteAction(documentId: string): Promise<ActionResult> {
  try {
    // permanent delete ต้องมีสิทธิ์ระดับสูง (สเปคหมวด 21)
    const user = await requirePermission(PERMISSIONS.DOCUMENT_DELETE);
    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId: user.organizationId, deletedAt: { not: null } },
      select: {
        id: true,
        title: true,
        legalHold: true,
        versions: { select: { storageKey: true } },
      },
    });
    if (!doc) return actionError("ไม่พบเอกสารในถังขยะ");
    if (doc.legalHold) return actionError("เอกสารนี้ติด Legal Hold ไม่สามารถลบถาวรได้");

    // ลบไฟล์จริงจาก storage ก่อน แล้วค่อยลบ record
    const storage = getStorage();
    const uniqueKeys = new Set(doc.versions.map((v) => v.storageKey));
    for (const key of uniqueKeys) {
      await storage.delete(key).catch(() => {});
    }

    await db.document.delete({ where: { id: documentId } });
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "document.permanent_deleted",
      entityType: "Document",
      entityId: documentId,
      metadata: { title: doc.title },
    });
    revalidatePath("/trash");
    return actionOk(undefined);
  } catch (e) {
    return actionError(toErrorResponse(e).message);
  }
}
