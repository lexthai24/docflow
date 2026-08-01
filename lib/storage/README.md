# Storage Abstraction

DocFlow ใช้ storage abstraction (`StorageAdapter`) เพื่อแยก business logic ออกจากที่เก็บไฟล์จริง
Database เก็บเฉพาะ metadata + `storageKey` — **ไม่เก็บ binary ในฐานข้อมูล**

## Drivers

| Driver | ใช้เมื่อ | ตั้งค่า |
|--------|---------|--------|
| `local` | development | `STORAGE_DRIVER=local`, `LOCAL_STORAGE_PATH=./storage/uploads` |
| `s3` | production | `STORAGE_DRIVER=s3` + ตัวแปร `S3_*` |

## เพิ่ม S3 Adapter (production)

โครงสร้างพร้อมต่อยอดแล้ว ทำตามนี้:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

สร้าง `lib/storage/s3.ts` implement `StorageAdapter` โดยใช้ `S3Client`
(รองรับ AWS S3 / Cloudflare R2 / MinIO ผ่าน `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE`)
แล้ว uncomment การเลือก adapter ใน `lib/storage/index.ts`

`getSignedUrl()` ควรใช้ `getSignedUrl` จาก `@aws-sdk/s3-request-presigner`
เพื่อออก presigned URL แบบหมดอายุ — **ห้ามเปิด bucket เป็น public**

## ความปลอดภัย (สเปคหมวด 9, 10)

- ทุก key เป็น random (`generateStorageKey`) — ไม่ใช้ชื่อไฟล์เดิม
- Local adapter ป้องกัน path traversal (ตรวจ resolved path อยู่ใน root)
- Download/preview ตรวจ permission ฝั่ง server ก่อนเสมอ (`/api/files/[...]`)
- ตรวจ extension + MIME type ทั้ง client และ server
