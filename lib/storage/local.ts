import "server-only";
import { promises as fs, createReadStream as fsCreateReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageAdapter, PutObjectInput, StorageObjectMeta } from "@/lib/storage/types";
import { StorageError } from "@/lib/errors";

// Local filesystem storage (dev) — ป้องกัน path traversal อย่างเข้มงวด
export class LocalStorageAdapter implements StorageAdapter {
  readonly provider = "LOCAL" as const;
  private root: string;

  constructor(rootPath: string) {
    this.root = path.resolve(process.cwd(), rootPath);
  }

  /** resolve key เป็น absolute path พร้อมตรวจว่าไม่หลุดออกนอก root (สเปคหมวด 9) */
  private resolveKey(key: string): string {
    // ห้ามมี .. หรือ absolute path
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = path.resolve(this.root, normalized);
    if (!full.startsWith(this.root + path.sep) && full !== this.root) {
      throw new StorageError("เส้นทางไฟล์ไม่ถูกต้อง");
    }
    return full;
  }

  async upload(input: PutObjectInput): Promise<void> {
    const full = this.resolveKey(input.key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, input.body);
  }

  async download(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolveKey(key));
    } catch {
      throw new StorageError("ไม่พบไฟล์ในระบบจัดเก็บ");
    }
  }

  async createReadStream(key: string): Promise<ReadableStream<Uint8Array>> {
    const full = this.resolveKey(key);
    if (!(await this.exists(key))) throw new StorageError("ไม่พบไฟล์ในระบบจัดเก็บ");
    const nodeStream = fsCreateReadStream(full);
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch {
      // ไฟล์ไม่มีอยู่ = ถือว่าลบสำเร็จ (idempotent)
    }
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    const dest = this.resolveKey(destKey);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(this.resolveKey(sourceKey), dest);
  }

  async move(sourceKey: string, destKey: string): Promise<void> {
    await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageObjectMeta | null> {
    try {
      const stat = await fs.stat(this.resolveKey(key));
      return { key, size: stat.size, contentType: "application/octet-stream", lastModified: stat.mtime };
    } catch {
      return null;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    // local ไม่มี signed URL — ใช้ protected download route แทน
    return `/api/files/${encodeURIComponent(key)}`;
  }
}
