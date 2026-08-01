# DocFlow Enterprise

ระบบจัดการเอกสารระดับองค์กร (Enterprise Document Management System) สำหรับจัดเก็บ ค้นหา จัดหมวดหมู่ แชร์ ตรวจสอบ อนุมัติ และติดตามเอกสารภายในองค์กร

สร้างด้วย **Next.js 16 (App Router) · React 19 · TypeScript strict · PostgreSQL · Prisma 7 · Tailwind CSS v4**

---

## สารบัญ

- [ฟีเจอร์หลัก](#ฟีเจอร์หลัก)
- [Technology Stack และเหตุผล](#technology-stack-และเหตุผล)
- [สถาปัตยกรรม](#สถาปัตยกรรม)
- [การติดตั้ง (Quick Start)](#การติดตั้ง-quick-start)
- [Environment Variables](#environment-variables)
- [คำสั่งที่ใช้บ่อย](#คำสั่งที่ใช้บ่อย)
- [บัญชีสำหรับ Development](#บัญชีสำหรับ-development)
- [ความปลอดภัย](#ความปลอดภัย)
- [การ Deploy Production](#การ-deploy-production)
- [ข้อจำกัดที่ยังเหลือ](#ข้อจำกัดที่ยังเหลือ)

---

## ฟีเจอร์หลัก

- 🔐 **Authentication + RBAC** — session ปลอดภัย (JWT + DB), Argon2 hashing, 8 บทบาทมาตรฐาน, permission ละเอียด 28 รายการ
- 📁 **โฟลเดอร์ลำดับชั้น** — สร้าง/แก้ไข/ย้าย/ลบ, ป้องกัน circular hierarchy, สืบทอดสิทธิ์
- 📄 **จัดการเอกสาร** — อัปโหลดหลายไฟล์พร้อม progress, metadata, tags, ระดับความลับ
- 🗂️ **Version Control** — เก็บทุกเวอร์ชัน (ไม่เขียนทับ), กู้คืนเวอร์ชันเก่าเป็นเวอร์ชันใหม่
- 👁️ **Preview** — PDF, รูปภาพ (หมุน/ซูม), ข้อความ, CSV; โครงสร้างพร้อมต่อ conversion service
- 🔎 **ค้นหาและกรอง** — ค้นหา + filter หลายมิติ, permission-filtered, server-side pagination
- ✅ **Workflow** — state machine ตรวจสอบ → อนุมัติ, sequential/parallel, ผ่าน service ฝั่ง server เท่านั้น
- 💬 **Comments** — thread + reply, internal notes
- 🔔 **Notifications** — in-app notification center
- 📊 **Dashboard + Reports** — สถิติจริงจาก PostgreSQL, กราฟ, role-aware
- 🗑️ **Trash/Restore** — soft delete + กู้คืน + ลบถาวร (permission-gated)
- 📜 **Audit Log** — บันทึกทุกกิจกรรม append-only, mask ข้อมูลอ่อนไหว
- 🌓 **Light/Dark mode** + รองรับภาษาไทยสมบูรณ์ (IBM Plex Sans Thai)
- 📱 **Responsive** — desktop / tablet / mobile

---

## Technology Stack และเหตุผล

| ส่วน | เลือกใช้ | เหตุผล |
|------|---------|--------|
| Framework | **Next.js 16 (App Router)** | ติดตั้งอยู่แล้ว; Server Components + Server Actions ลด client JS และรวม auth check ไว้ฝั่ง server |
| ORM | **Prisma 7** | Type-safe เต็มรูปแบบ, migration ในตัว, เหมาะกับ schema ที่มี relation จำนวนมาก (35 models). ใช้ driver adapter `@prisma/adapter-pg` (บังคับใน Prisma 7) |
| Auth | **Custom (jose + argon2)** | สเปคระบุ Argon2/jose ได้; custom credentials session ที่ปลอดภัย (HTTP-only cookie + DB-backed session) เบากว่าและควบคุมได้เต็มที่ ไม่ต้องพึ่ง provider ภายนอก |
| Validation | **Zod v4** | Validate ทั้ง client + server, server เป็นแหล่งความจริง |
| Forms | **React Hook Form + `useActionState`** | จัดการ error รายฟิลด์ + loading state + กัน submit ซ้ำ |
| UI | **Custom design system + Tailwind v4** | Component ที่ควบคุมได้เต็มที่ (button, dialog, dropdown, table, charts) พร้อม lucide icons |
| Charts | **SVG/CSS ล้วน** | ไม่พึ่ง lib ภายนอก → bundle เล็ก, self-contained |
| Storage | **Adapter (local + S3 interface)** | dev ใช้ local filesystem; production เปลี่ยนเป็น S3/R2/MinIO ได้โดยไม่แก้ business logic |
| Testing | **Vitest** | เร็ว, เข้ากับ TS/ESM; ทดสอบ workflow + permission + document-number |

---

## สถาปัตยกรรม

```
app/
  (auth)/          หน้า login + auth actions
  (app)/           หน้าที่ต้องล็อกอิน (มี AppShell layout)
    dashboard/ documents/ folders/ upload/ review/ approvals/
    expiring/ archive/ trash/ favorites/ recent/ shared/
    search/ notifications/ audit/ reports/ profile/ preferences/
    admin/         users, departments, categories, workflows, settings
  api/
    documents/upload/          route handler รับ multipart upload
    documents/[id]/download/   protected download/preview (ตรวจ permission)
components/
  ui/              design system (button, card, dialog, dropdown, tabs, badge...)
  shell/           sidebar, topbar, page-header, app-shell
  documents/       file-icon, document-table, simple list
  charts.tsx       BarChart, DonutChart, HorizontalBars
lib/
  db.ts            Prisma client (driver adapter)
  env.ts           ตรวจสอบ env ด้วย Zod (fail fast)
  auth/            session (jose), dal (verifySession/getCurrentUser), access-control (ACL)
  services/        business logic: documents, folders, workflow, dashboard...
  storage/         adapter (local + S3 contract)
  permissions.ts   catalog สิทธิ์ + role mapping
  workflow-rules.ts state machine (pure, ทดสอบได้)
  validations/     Zod schemas
prisma/
  schema.prisma    35 models
  seed.ts          ข้อมูลตัวอย่าง
tests/             unit tests (vitest)
proxy.ts           Next.js 16 middleware — optimistic route protection
```

**หลักการ**: UI ไม่เขียน business logic สำคัญ · Permission ตรวจฝั่ง server ทุก operation · Workflow logic อยู่ใน service · Storage ผ่าน adapter · ทุก mutation ใช้ transaction เมื่อจำเป็น

### การควบคุมสิทธิ์ (2 ชั้น)

1. **Optimistic** (`proxy.ts`) — อ่าน cookie เท่านั้น redirect เร็ว ไม่แตะ DB
2. **Secure** (DAL + access-control) — ตรวจ session กับ DB + resolve ACL (owner/department/role/folder ACL/document ACL/explicit deny) ที่ระดับ page/action/route ทุกครั้ง

---

## การติดตั้ง (Quick Start)

### 1. ต้องมี PostgreSQL

ต้องมีฐานข้อมูล PostgreSQL (local, Docker, หรือ cloud เช่น Prisma Postgres / Supabase / Neon)

### 2. ตั้งค่า environment

```bash
cp .env.example .env.local
```

แก้ `.env.local` — อย่างน้อยต้องตั้ง:

```bash
# ชี้ไปที่ PostgreSQL ของคุณ
DATABASE_URL="postgresql://user:password@localhost:5432/docflow?schema=public"

# สร้างด้วย: openssl rand -base64 48
AUTH_SECRET="<ค่าสุ่มยาว>"

# บัญชี dev (จะถูกสร้างตอน seed)
SEED_ADMIN_EMAIL="admin@docflow.local"
SEED_ADMIN_PASSWORD="<รหัสผ่านที่คุณเลือก>"
SEED_USER_PASSWORD="<รหัสผ่านผู้ใช้ตัวอย่าง>"
```

### 3. ติดตั้ง dependencies + สร้างฐานข้อมูล

```bash
npm install
npm run db:generate    # generate Prisma client
npm run db:migrate     # สร้างตาราง (prisma migrate dev)
npm run db:seed        # ใส่ข้อมูลตัวอย่าง
```

### 4. รัน dev server

```bash
npm run dev
```

เปิด http://localhost:3000 แล้วล็อกอินด้วย `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`

---

## Environment Variables

ดู `.env.example` สำหรับรายการเต็ม สรุปตัวสำคัญ:

| ตัวแปร | จำเป็น | คำอธิบาย |
|--------|--------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DIRECT_URL` | ⬜ | connection ตรง (ใช้เมื่อ DATABASE_URL เป็น pooler) สำหรับ migrate |
| `AUTH_SECRET` | ✅ | ความลับเซ็น session (≥16 ตัว) |
| `SESSION_MAX_AGE` | ⬜ | อายุ session (วินาที) ค่าเริ่มต้น 604800 (7 วัน) |
| `STORAGE_DRIVER` | ⬜ | `local` (dev) หรือ `s3` (production) |
| `LOCAL_STORAGE_PATH` | ⬜ | โฟลเดอร์เก็บไฟล์เมื่อใช้ local |
| `S3_*` | ⬜ | ตั้งเมื่อ `STORAGE_DRIVER=s3` (ดู lib/storage/README.md) |
| `MAX_UPLOAD_SIZE` | ⬜ | ขนาดไฟล์สูงสุด (bytes) ค่าเริ่มต้น 50MB |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | seed | บัญชี admin (อ่านจาก env — ไม่ hardcode) |
| `SEED_USER_PASSWORD` | seed | รหัสผ่านผู้ใช้ตัวอย่างอื่น |

> **ห้าม commit** `.env.local` — ถูก git ignore แล้ว

---

## คำสั่งที่ใช้บ่อย

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # รัน production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest (unit tests)

npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy (production)
npm run db:seed      # ใส่ข้อมูลตัวอย่าง
npm run db:studio    # Prisma Studio (ดู/แก้ข้อมูล)
npm run db:reset     # reset + migrate + seed ใหม่
```

---

## บัญชีสำหรับ Development

seed สร้างผู้ใช้ 8 คนครอบคลุมทุกบทบาท (รหัสผ่านมาจาก env — **ไม่เปิดเผยในโค้ด**):

| อีเมล | บทบาท |
|-------|-------|
| `SEED_ADMIN_EMAIL` (ตั้งเอง) | SUPER_ADMIN |
| `records@docflow.local` | RECORDS_MANAGER |
| `hr.manager@docflow.local` | DEPARTMENT_MANAGER |
| `approver@docflow.local` | APPROVER |
| `reviewer@docflow.local` | REVIEWER |
| `editor@docflow.local` / `editor2@docflow.local` | EDITOR |
| `viewer@docflow.local` | VIEWER |

ผู้ใช้ที่ไม่ใช่ admin ใช้รหัสผ่านจาก `SEED_USER_PASSWORD`

> seed จะ **ปฏิเสธการทำงาน** ถ้า `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` ยังเป็นค่า placeholder `CHANGE_ME` — เป็น guard ป้องกันรหัสผ่านอ่อนหลุดเข้า DB

---

## ความปลอดภัย

- Password hash ด้วย **Argon2id**
- Session: **HTTP-only, SameSite=lax, Secure** (production), เก็บ token hash ใน DB (revocable)
- Login rate limiting (5 ครั้ง/15 นาที), upload rate limiting
- ทุก Server Action / Route Handler / Download ตรวจ **auth + permission + ACL ฝั่ง server** — ไม่พึ่งการซ่อนปุ่มใน UI
- Upload: ตรวจ MIME + extension + ขนาด, **random storage key** (ไม่ใช้ชื่อไฟล์เดิม), SHA-256 checksum, ป้องกัน path traversal
- Download ผ่าน protected route (ตรวจ permission ก่อนสตรีมไฟล์), `Content-Disposition` + `X-Content-Type-Options: nosniff`
- Audit log **mask** password/token/secret
- Environment variables ตรวจสอบด้วย Zod ตอน boot (fail fast)
- ไม่มี secret hardcode; `.env*` ถูก git ignore

---

## การ Deploy Production

1. ตั้ง environment variables บน host (โดยเฉพาะ `DATABASE_URL`, `AUTH_SECRET`, `STORAGE_DRIVER=s3` + `S3_*`)
2. `npm run db:deploy` — apply migrations (ไม่ใช่ `migrate dev`)
3. `npm run build` แล้ว `npm run start`
4. **Storage**: ตั้ง `STORAGE_DRIVER=s3` และ implement `S3StorageAdapter` (ดู `lib/storage/README.md`) — อย่าเปิด bucket เป็น public
5. ควรวางหลัง reverse proxy ที่ตั้ง `X-Forwarded-For` (audit log บันทึก IP)
6. พิจารณาเปลี่ยน rate limiter เป็น Redis-based สำหรับ multi-instance

---

## ข้อจำกัดที่ยังเหลือ

รายการที่ออกแบบโครงสร้างไว้แต่ยังทำเป็น extension point (พร้อมต่อยอด):

- **S3 storage adapter** — interface พร้อม, ต้อง implement `S3StorageAdapter` ด้วย `@aws-sdk/client-s3` สำหรับ production
- **OCR / text extraction** — มี field + status enum (PENDING/PROCESSING/...) และ hook พร้อม แต่ตัว OCR engine ยังไม่ผูก
- **Preview DOCX/XLSX/PPTX** — แสดง file info + download; adapter สำหรับ conversion service (OnlyOffice/LibreOffice) เตรียมไว้
- **Email notifications** — in-app notification ทำงานครบ; email adapter เตรียม interface ไว้ยังไม่ผูก provider
- **Background jobs** — งานหนัก (OCR, expiration reminder, report export) ออกแบบให้ทำ async ได้ ยังไม่ติดตั้ง queue ภายนอก
- **Custom role UI / metadata field builder** — schema รองรับเต็ม, UI สร้าง custom role/field ยังไม่ครบทุกหน้า
- **npm audit**: มี 3 high-severity advisories ใน transitive deps ของ Next.js เอง (postcss/sharp) — การ "fix" จะ downgrade Next.js ซึ่งขัดข้อกำหนด จึงคงไว้รอ Next.js patch

---

หมายเหตุ: โปรเจกต์นี้ใช้ Next.js 16 ซึ่งมี breaking changes จากเวอร์ชันก่อน (async `cookies()`/`params`, middleware → `proxy.ts`, Prisma 7 driver adapter) — ดูรายละเอียดใน `AGENTS.md`
