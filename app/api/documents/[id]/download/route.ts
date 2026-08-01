import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { assertAuthenticated } from "@/lib/auth/dal";
import { canAccessDocument } from "@/lib/auth/access-control";
import { getStorage } from "@/lib/storage";
import { audit, AUDIT } from "@/lib/audit";

// ดาวน์โหลด/พรีวิวไฟล์ — ตรวจ permission ฝั่ง server ก่อนเสมอ (สเปคหมวด 9, 10, 17)
// ?version=<id> เพื่อดึงเวอร์ชันเจาะจง, ?inline=1 เพื่อ preview ในเบราว์เซอร์

export async function GET(req: NextRequest, ctx: RouteContext<"/api/documents/[id]/download">) {
  const { id } = await ctx.params;

  let user;
  try {
    user = await assertAuthenticated();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const versionId = req.nextUrl.searchParams.get("version");

  // ต้องมีสิทธิ์ DOWNLOAD (preview ต้องอย่างน้อย VIEW)
  const required = inline ? "VIEW" : "DOWNLOAD";
  const allowed = await canAccessDocument(user, id, required);
  if (!allowed) {
    return new Response("คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้", { status: 403 });
  }

  const doc = await db.document.findFirst({
    where: { id, organizationId: user.organizationId, deletedAt: null },
    select: { id: true, currentVersionId: true },
  });
  if (!doc) return new Response("ไม่พบเอกสาร", { status: 404 });

  const version = await db.documentVersion.findFirst({
    where: {
      id: versionId ?? doc.currentVersionId ?? undefined,
      documentId: doc.id,
    },
    select: {
      storageKey: true,
      originalFilename: true,
      mimeType: true,
      fileSize: true,
    },
  });
  if (!version) return new Response("ไม่พบไฟล์", { status: 404 });

  const storage = getStorage();
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await storage.createReadStream(version.storageKey);
  } catch {
    return new Response("ไม่พบไฟล์ในระบบจัดเก็บ", { status: 404 });
  }

  if (!inline) {
    // audit เฉพาะการ download จริง (ไม่ audit ทุก preview เพื่อลด noise)
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.DOCUMENT_DOWNLOADED,
      entityType: "Document",
      entityId: doc.id,
    });
  }

  // RFC 5987 filename* รองรับ unicode (ไทย)
  const encodedName = encodeURIComponent(version.originalFilename);
  const disposition = `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodedName}`;

  return new Response(stream, {
    headers: {
      "Content-Type": version.mimeType,
      "Content-Disposition": disposition,
      "Content-Length": String(version.fileSize),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
