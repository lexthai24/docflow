import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { assertAuthenticated, hasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";
import { env } from "@/lib/env";
import { audit, AUDIT } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import {
  getStorage,
  generateStorageKey,
  sanitizeFilename,
  getExtension,
  isAllowedExtension,
  isAllowedMimeType,
} from "@/lib/storage";
import { nextDocumentNumber } from "@/lib/document-number";
import { toErrorResponse } from "@/lib/errors";

// อัปโหลดเอกสาร (สเปคหมวด 9) — route handler เพราะรองรับ binary/multipart
// ตรวจ: auth, permission, MIME, extension, ขนาด, path traversal, duplicate hash

export async function POST(req: NextRequest) {
  try {
    const user = await assertAuthenticated();
    if (!hasPermission(user, PERMISSIONS.DOCUMENT_CREATE)) {
      return NextResponse.json({ ok: false, error: "คุณไม่มีสิทธิ์อัปโหลดเอกสาร" }, { status: 403 });
    }

    // rate limit อัปโหลด: 30 ครั้ง / นาที ต่อ user
    const rl = rateLimit(`upload:${user.id}`, 30, 60);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "อัปโหลดบ่อยเกินไป กรุณารอสักครู่" },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
    }

    // ── validation ──
    if (file.size === 0) {
      return NextResponse.json({ ok: false, error: "ไฟล์ว่างเปล่า" }, { status: 400 });
    }
    if (file.size > env.MAX_UPLOAD_SIZE) {
      const mb = Math.round(env.MAX_UPLOAD_SIZE / 1024 / 1024);
      return NextResponse.json(
        { ok: false, error: `ไฟล์มีขนาดเกินกำหนด (สูงสุด ${mb} MB)` },
        { status: 400 },
      );
    }

    const originalFilename = sanitizeFilename(file.name);
    const ext = getExtension(originalFilename);
    if (!isAllowedExtension(ext)) {
      return NextResponse.json(
        { ok: false, error: `ไม่รองรับประเภทไฟล์ .${ext}` },
        { status: 400 },
      );
    }
    const mimeType = file.type || "application/octet-stream";
    if (!isAllowedMimeType(mimeType)) {
      return NextResponse.json(
        { ok: false, error: `ไม่รองรับประเภทไฟล์นี้ (${mimeType})` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(buffer).digest("hex");

    // ── duplicate detection (สเปคหมวด 9): เตือนถ้ามีไฟล์เนื้อหาเดียวกันในองค์กร ──
    const duplicate = await db.documentVersion.findFirst({
      where: { checksum, document: { organizationId: user.organizationId, deletedAt: null } },
      select: { documentId: true, document: { select: { title: true, documentNumber: true } } },
    });

    // metadata เพิ่มเติมจาก form
    const title = (formData.get("title") as string)?.trim() || originalFilename.replace(/\.[^.]+$/, "");
    const folderId = (formData.get("folderId") as string) || null;
    const categoryId = (formData.get("categoryId") as string) || null;
    const confidentiality = (formData.get("confidentiality") as string) || "INTERNAL";
    const description = (formData.get("description") as string)?.trim() || null;
    const expirationRaw = formData.get("expirationDate") as string;
    const expirationDate = expirationRaw ? new Date(expirationRaw) : null;

    // ตรวจ folder/category อยู่ในองค์กรเดียวกัน
    if (folderId) {
      const f = await db.folder.findFirst({
        where: { id: folderId, organizationId: user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!f) return NextResponse.json({ ok: false, error: "ไม่พบโฟลเดอร์" }, { status: 400 });
    }

    const storage = getStorage();

    // ── สร้าง document + version ใน transaction ──
    const result = await db.$transaction(async (tx) => {
      const documentNumber = await nextDocumentNumber(tx, user.organizationId);

      const doc = await tx.document.create({
        data: {
          organizationId: user.organizationId,
          documentNumber,
          title,
          description,
          folderId,
          categoryId,
          ownerId: user.id,
          departmentId: user.departmentId,
          status: "DRAFT",
          confidentialityLevel: confidentiality as never,
          expirationDate,
          searchText: [title, documentNumber, description, originalFilename]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        },
        select: { id: true, documentNumber: true },
      });

      const { key, storedFilename } = generateStorageKey(doc.id, 1, ext);

      const version = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          storageProvider: storage.provider,
          storageKey: key,
          originalFilename,
          storedFilename,
          mimeType,
          extension: ext,
          fileSize: BigInt(file.size),
          checksum,
          isCurrent: true,
          createdById: user.id,
          ocrStatus: mimeType === "application/pdf" ? "PENDING" : "NOT_REQUIRED",
        },
        select: { id: true, storageKey: true },
      });

      await tx.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
      });

      return { doc, version };
    });

    // ── เขียนไฟล์ลง storage (นอก transaction — I/O) ──
    await storage.upload({ key: result.version.storageKey, body: buffer, contentType: mimeType });

    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.DOCUMENT_CREATED,
      entityType: "Document",
      entityId: result.doc.id,
      newValues: { title, documentNumber: result.doc.documentNumber },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: result.doc.id,
        documentNumber: result.doc.documentNumber,
        title,
        duplicateOf: duplicate
          ? { id: duplicate.documentId, title: duplicate.document.title, documentNumber: duplicate.document.documentNumber }
          : null,
      },
    });
  } catch (e) {
    const r = toErrorResponse(e);
    return NextResponse.json({ ok: false, error: r.message }, { status: 500 });
  }
}
