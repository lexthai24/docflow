import "server-only";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { env } from "@/lib/env";
import type { StorageAdapter } from "@/lib/storage/types";
import { LocalStorageAdapter } from "@/lib/storage/local";
import { StorageError } from "@/lib/errors";

// Factory เลือก storage adapter ตาม STORAGE_DRIVER (สเปคหมวด 10)
let cached: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (cached) return cached;

  if (env.STORAGE_DRIVER === "s3") {
    // S3 adapter โหลดแบบ dynamic เพื่อไม่บังคับติดตั้ง SDK ถ้าใช้ local
    // ต้องติดตั้ง @aws-sdk/client-s3 และ @aws-sdk/s3-request-presigner ก่อน
    // แล้ว uncomment การ import ด้านล่าง (โครงสร้างพร้อมต่อยอด)
    throw new StorageError(
      "S3 storage driver ยังไม่ได้ตั้งค่า — ติดตั้ง @aws-sdk/client-s3 และสร้าง S3StorageAdapter (ดู lib/storage/README) หรือใช้ STORAGE_DRIVER=local",
    );
  }

  cached = new LocalStorageAdapter(env.LOCAL_STORAGE_PATH);
  return cached;
}

// ── ชื่อไฟล์ + storage key ──

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "jpg", "jpeg", "png", "webp", "svg", "zip",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ""));
}

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime.toLowerCase());
}

/** sanitize ชื่อไฟล์: ตัดอักขระอันตราย คง unicode (ไทย) ได้ */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 255)
    .trim() || "file";
}

export function getExtension(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return ext;
}

/**
 * สร้าง random storage key — ห้ามใช้ชื่อไฟล์เดิมเป็น key โดยตรง (สเปคหมวด 9)
 * รูปแบบ: documents/{docId}/{versionNumber}/{random}.{ext}
 */
export function generateStorageKey(
  documentId: string,
  versionNumber: number,
  ext: string,
): { key: string; storedFilename: string } {
  const random = randomBytes(16).toString("hex");
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const storedFilename = `${random}.${safeExt}`;
  return {
    key: `documents/${documentId}/v${versionNumber}/${storedFilename}`,
    storedFilename,
  };
}

export type { StorageAdapter };
