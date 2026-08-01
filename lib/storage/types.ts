// Storage abstraction interface (สเปคหมวด 10)
// รองรับ local filesystem (dev) และ S3-compatible (production)
// Database เก็บเฉพาะ metadata + storage key — ไม่เก็บ binary

export interface StorageObjectMeta {
  key: string;
  size: number;
  contentType: string;
  lastModified?: Date;
}

export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface StorageAdapter {
  readonly provider: "LOCAL" | "S3";
  upload(input: PutObjectInput): Promise<void>;
  download(key: string): Promise<Buffer>;
  createReadStream(key: string): Promise<ReadableStream<Uint8Array>>;
  delete(key: string): Promise<void>;
  copy(sourceKey: string, destKey: string): Promise<void>;
  move(sourceKey: string, destKey: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<StorageObjectMeta | null>;
  /** signed URL หรือ protected route path — สำหรับ preview/download */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
