/**
 * DocFlow Enterprise — Seed script (สเปคหมวด 30)
 * รัน: npm run db:seed
 *
 * สร้าง: องค์กร, roles+permissions, แผนก, ทีม, ผู้ใช้, หมวดหมู่, tags,
 * โฟลเดอร์, เอกสาร+เวอร์ชัน, comments, notifications, audit logs
 *
 * บัญชี admin อ่านจาก env: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * รหัสผ่านผู้ใช้อื่นจาก SEED_USER_PASSWORD — ไม่มี hardcode
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import { createHash } from "node:crypto";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_KEYS,
  type RoleKey,
} from "../lib/permissions.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function hash(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id });
}

function searchTextOf(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userPassword = process.env.SEED_USER_PASSWORD;

  if (!adminEmail || !adminPassword || adminPassword.startsWith("CHANGE_ME")) {
    throw new Error(
      "❌ ต้องตั้ง SEED_ADMIN_EMAIL และ SEED_ADMIN_PASSWORD (ค่าจริง ไม่ใช่ CHANGE_ME) ใน .env.local ก่อน seed",
    );
  }
  if (!userPassword || userPassword.startsWith("CHANGE_ME")) {
    throw new Error("❌ ต้องตั้ง SEED_USER_PASSWORD (ค่าจริง) ใน .env.local ก่อน seed");
  }

  console.log("🌱 เริ่ม seed DocFlow Enterprise...");

  // ── ล้างข้อมูลเดิม (dev only) ──
  console.log("  • ล้างข้อมูลเดิม...");
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.notification.deleteMany(),
    db.commentMention.deleteMany(),
    db.comment.deleteMany(),
    db.recentDocument.deleteMany(),
    db.favorite.deleteMany(),
    db.documentTag.deleteMany(),
    db.documentMetadataValue.deleteMany(),
    db.documentPermission.deleteMany(),
    db.documentLock.deleteMany(),
    db.documentRelation.deleteMany(),
    db.approvalDecision.deleteMany(),
    db.workflowAssignment.deleteMany(),
    db.workflowInstance.deleteMany(),
  ]);
  await db.$transaction([
    db.documentVersion.deleteMany(),
    db.document.deleteMany(),
    db.folderPermission.deleteMany(),
    db.folder.deleteMany(),
    db.documentSequence.deleteMany(),
    db.metadataDefinition.deleteMany(),
    db.tag.deleteMany(),
    db.category.deleteMany(),
    db.retentionPolicy.deleteMany(),
    db.workflowStep.deleteMany(),
    db.workflowTemplate.deleteMany(),
    db.savedSearch.deleteMany(),
    db.userPreference.deleteMany(),
    db.session.deleteMany(),
    db.teamMember.deleteMany(),
    db.team.deleteMany(),
  ]);
  await db.$transaction([
    db.userRole.deleteMany(),
    db.rolePermission.deleteMany(),
  ]);
  await db.$transaction([
    db.user.deleteMany(),
    db.department.deleteMany(),
    db.role.deleteMany(),
    db.permission.deleteMany(),
    db.organization.deleteMany(),
  ]);

  // ── องค์กร ──
  console.log("  • สร้างองค์กร...");
  const org = await db.organization.create({
    data: {
      name: "บริษัท ดอคโฟลว์ เอ็นเตอร์ไพรส์ จำกัด",
      slug: "docflow",
      email: "info@docflow.local",
      phone: "02-000-0000",
      address: "123 อาคารเอกสาร ถนนสุขุมวิท กรุงเทพฯ 10110",
      timezone: "Asia/Bangkok",
      locale: "th",
      primaryColor: "#1e3a8a",
      settings: {
        documentNumber: { prefix: "DOC", includeYear: true, padding: 6, resetPeriod: "yearly" },
        upload: { maxSizeMb: 50 },
      },
    },
  });

  // ── Permissions ──
  console.log("  • สร้าง permissions...");
  await db.permission.createMany({
    data: ALL_PERMISSIONS.map((p) => ({ key: p.key, description: p.description })),
  });
  const allPerms = await db.permission.findMany({ select: { id: true, key: true } });
  const permIdByKey = new Map(allPerms.map((p) => [p.key, p.id]));

  // ── Roles + RolePermissions ──
  console.log("  • สร้าง roles...");
  const roleIdByKey = new Map<string, string>();
  for (const key of Object.values(ROLE_KEYS) as RoleKey[]) {
    const def = DEFAULT_ROLE_PERMISSIONS[key];
    const role = await db.role.create({
      data: {
        organizationId: org.id,
        key,
        name: def.name,
        description: def.description,
        isSystem: true,
        rolePermissions: {
          create: def.permissions
            .map((pk) => permIdByKey.get(pk))
            .filter((id): id is string => Boolean(id))
            .map((permissionId) => ({ permissionId })),
        },
      },
    });
    roleIdByKey.set(key, role.id);
  }

  // ── Retention policies ──
  const retention5y = await db.retentionPolicy.create({
    data: { organizationId: org.id, name: "เก็บ 5 ปี", retentionDays: 365 * 5, actionOnExpiry: "ARCHIVE", reviewRequired: true },
  });
  await db.retentionPolicy.create({
    data: { organizationId: org.id, name: "เก็บ 10 ปี (สัญญา)", retentionDays: 365 * 10, actionOnExpiry: "REVIEW", reviewRequired: true },
  });

  // ── แผนก ──
  console.log("  • สร้างแผนก...");
  const deptData = [
    { name: "ทรัพยากรบุคคล", code: "HR" },
    { name: "การเงินและบัญชี", code: "FIN" },
    { name: "เทคโนโลยีสารสนเทศ", code: "IT" },
    { name: "กฎหมายและสัญญา", code: "LEGAL" },
    { name: "บริหารทั่วไป", code: "ADMIN" },
  ];
  const depts = new Map<string, string>();
  for (const d of deptData) {
    const dept = await db.department.create({
      data: { organizationId: org.id, name: d.name, code: d.code },
    });
    depts.set(d.code, dept.id);
  }

  // ── ผู้ใช้ ──
  console.log("  • สร้างผู้ใช้...");
  const adminHash = await hash(adminPassword);
  const userHash = await hash(userPassword);

  interface SeedUser {
    email: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    dept: string;
    role: RoleKey;
    isAdmin?: boolean;
  }
  const seedUsers: SeedUser[] = [
    { email: adminEmail, firstName: "ผู้ดูแล", lastName: "ระบบ", jobTitle: "System Administrator", dept: "IT", role: ROLE_KEYS.SUPER_ADMIN, isAdmin: true },
    { email: "records@docflow.local", firstName: "สมศรี", lastName: "จัดเก็บ", jobTitle: "Records Manager", dept: "ADMIN", role: ROLE_KEYS.RECORDS_MANAGER },
    { email: "hr.manager@docflow.local", firstName: "วิภา", lastName: "บุคคล", jobTitle: "HR Manager", dept: "HR", role: ROLE_KEYS.DEPARTMENT_MANAGER },
    { email: "approver@docflow.local", firstName: "ประเสริฐ", lastName: "อนุมัติ", jobTitle: "Finance Director", dept: "FIN", role: ROLE_KEYS.APPROVER },
    { email: "reviewer@docflow.local", firstName: "อรุณ", lastName: "ตรวจสอบ", jobTitle: "Senior Reviewer", dept: "LEGAL", role: ROLE_KEYS.REVIEWER },
    { email: "editor@docflow.local", firstName: "กมล", lastName: "เขียนงาน", jobTitle: "Document Specialist", dept: "HR", role: ROLE_KEYS.EDITOR },
    { email: "editor2@docflow.local", firstName: "นภา", lastName: "จัดทำ", jobTitle: "Content Officer", dept: "FIN", role: ROLE_KEYS.EDITOR },
    { email: "viewer@docflow.local", firstName: "สุดา", lastName: "อ่านเอกสาร", jobTitle: "Staff", dept: "IT", role: ROLE_KEYS.VIEWER },
  ];

  const users = new Map<string, string>();
  for (const u of seedUsers) {
    const user = await db.user.create({
      data: {
        organizationId: org.id,
        email: u.email,
        passwordHash: u.isAdmin ? adminHash : userHash,
        firstName: u.firstName,
        lastName: u.lastName,
        jobTitle: u.jobTitle,
        departmentId: depts.get(u.dept),
        status: "ACTIVE",
        lastLoginAt: u.isAdmin ? new Date() : null,
        userRoles: { create: { roleId: roleIdByKey.get(u.role)! } },
        preference: { create: {} },
      },
    });
    users.set(u.email, user.id);
  }

  // ตั้งผู้จัดการแผนก
  await db.department.update({ where: { id: depts.get("HR")! }, data: { managerId: users.get("hr.manager@docflow.local") } });

  // ── ทีม ──
  await db.team.create({
    data: {
      organizationId: org.id,
      name: "ทีมสรรหาบุคลากร",
      departmentId: depts.get("HR"),
      leadId: users.get("hr.manager@docflow.local"),
      members: {
        create: [
          { userId: users.get("editor@docflow.local")! },
          { userId: users.get("hr.manager@docflow.local")! },
        ],
      },
    },
  });

  // ── หมวดหมู่ ──
  console.log("  • สร้างหมวดหมู่ + tags + metadata...");
  const catData = [
    { name: "สัญญา", code: "CONTRACT", color: "#7c3aed", icon: "FileSignature" },
    { name: "หนังสือราชการ", code: "OFFICIAL", color: "#2563eb", icon: "FileText" },
    { name: "นโยบายและระเบียบ", code: "POLICY", color: "#059669", icon: "BookText" },
    { name: "รายงานการเงิน", code: "FINREPORT", color: "#d97706", icon: "TrendingUp" },
    { name: "เอกสาร HR", code: "HRDOC", color: "#db2777", icon: "Users" },
  ];
  const cats = new Map<string, string>();
  for (const c of catData) {
    const cat = await db.category.create({
      data: {
        organizationId: org.id,
        name: c.name,
        code: c.code,
        color: c.color,
        icon: c.icon,
        retentionPolicyId: c.code === "CONTRACT" ? retention5y.id : null,
      },
    });
    cats.set(c.code, cat.id);
  }

  // Metadata template สำหรับหมวด "สัญญา"
  await db.metadataDefinition.createMany({
    data: [
      { organizationId: org.id, categoryId: cats.get("CONTRACT"), key: "party", label: "คู่สัญญา", fieldType: "TEXT", required: true, order: 1 },
      { organizationId: org.id, categoryId: cats.get("CONTRACT"), key: "value", label: "มูลค่าสัญญา (บาท)", fieldType: "NUMBER", order: 2 },
      { organizationId: org.id, categoryId: cats.get("CONTRACT"), key: "startDate", label: "วันที่เริ่มต้น", fieldType: "DATE", order: 3 },
      { organizationId: org.id, categoryId: cats.get("CONTRACT"), key: "endDate", label: "วันที่สิ้นสุด", fieldType: "DATE", order: 4 },
    ],
  });

  // ── Tags ──
  const tagNames = ["ด่วน", "ลับ", "ปี 2026", "ต้องทบทวน", "อนุมัติแล้ว", "ต้นฉบับ"];
  const tags = new Map<string, string>();
  for (const name of tagNames) {
    const t = await db.tag.create({ data: { organizationId: org.id, name } });
    tags.set(name, t.id);
  }

  // ── โฟลเดอร์ ──
  console.log("  • สร้างโฟลเดอร์...");
  const rootFolders = [
    { name: "สัญญาและข้อตกลง", dept: "LEGAL" },
    { name: "เอกสารทรัพยากรบุคคล", dept: "HR" },
    { name: "รายงานการเงิน", dept: "FIN" },
    { name: "นโยบายองค์กร", dept: "ADMIN" },
  ];
  const folders = new Map<string, string>();
  for (const f of rootFolders) {
    const folder = await db.folder.create({
      data: {
        organizationId: org.id,
        name: f.name,
        path: "/",
        ownerId: users.get(adminEmail),
        departmentId: depts.get(f.dept),
      },
    });
    folders.set(f.name, folder.id);
  }
  // โฟลเดอร์ย่อย
  const subFolder = await db.folder.create({
    data: {
      organizationId: org.id,
      name: "สัญญาปี 2026",
      parentId: folders.get("สัญญาและข้อตกลง"),
      path: `/${folders.get("สัญญาและข้อตกลง")}/`,
      ownerId: users.get(adminEmail),
      departmentId: depts.get("LEGAL"),
    },
  });
  folders.set("สัญญาปี 2026", subFolder.id);

  // ── Workflow template ──
  console.log("  • สร้าง workflow template...");
  const wf = await db.workflowTemplate.create({
    data: {
      organizationId: org.id,
      name: "ตรวจสอบและอนุมัติมาตรฐาน",
      description: "Reviewer ตรวจสอบ → Approver อนุมัติ",
      steps: {
        create: [
          { order: 1, name: "ตรวจสอบ", type: "REVIEW", mode: "SEQUENTIAL", requireComment: false, dueInDays: 3, assignees: [{ subjectType: "ROLE", subjectId: "REVIEWER" }] },
          { order: 2, name: "อนุมัติ", type: "APPROVAL", mode: "SEQUENTIAL", requireComment: true, dueInDays: 5, assignees: [{ subjectType: "ROLE", subjectId: "APPROVER" }] },
        ],
      },
    },
  });
  await db.category.update({ where: { id: cats.get("CONTRACT")! }, data: { defaultWorkflowId: wf.id } });

  // ── เอกสาร + เวอร์ชัน ──
  console.log("  • สร้างเอกสารตัวอย่าง...");
  const now = new Date();
  interface SeedDoc {
    title: string;
    desc: string;
    cat: string;
    folder: string;
    dept: string;
    owner: string;
    status: "DRAFT" | "IN_REVIEW" | "PENDING_APPROVAL" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
    conf: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    ext: string;
    mime: string;
    size: number;
    tags: string[];
    expiresInDays?: number;
  }
  const docs: SeedDoc[] = [
    { title: "สัญญาจ้างที่ปรึกษาโครงการ ERP", desc: "สัญญาว่าจ้างบริษัทที่ปรึกษาติดตั้งระบบ ERP", cat: "CONTRACT", folder: "สัญญาปี 2026", dept: "LEGAL", owner: "reviewer@docflow.local", status: "APPROVED", conf: "CONFIDENTIAL", priority: "HIGH", ext: "pdf", mime: "application/pdf", size: 842000, tags: ["ลับ", "อนุมัติแล้ว"], expiresInDays: 180 },
    { title: "นโยบายการลาประจำปี 2026", desc: "ระเบียบการลาพักร้อน ลากิจ ลาป่วย", cat: "POLICY", folder: "นโยบายองค์กร", dept: "ADMIN", owner: "editor@docflow.local", status: "PUBLISHED", conf: "INTERNAL", priority: "NORMAL", ext: "pdf", mime: "application/pdf", size: 320000, tags: ["ปี 2026"] },
    { title: "รายงานงบการเงินไตรมาส 2/2026", desc: "งบดุลและงบกำไรขาดทุน Q2", cat: "FINREPORT", folder: "รายงานการเงิน", dept: "FIN", owner: "editor2@docflow.local", status: "PENDING_APPROVAL", conf: "CONFIDENTIAL", priority: "HIGH", ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 156000, tags: ["ด่วน"] },
    { title: "แบบฟอร์มประเมินผลพนักงาน", desc: "แบบประเมิน KPI รายบุคคล", cat: "HRDOC", folder: "เอกสารทรัพยากรบุคคล", dept: "HR", owner: "editor@docflow.local", status: "IN_REVIEW", conf: "INTERNAL", priority: "NORMAL", ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 98000, tags: ["ต้องทบทวน"] },
    { title: "หนังสือเชิญประชุมคณะกรรมการ", desc: "เชิญประชุมวาระพิเศษ", cat: "OFFICIAL", folder: "นโยบายองค์กร", dept: "ADMIN", owner: "records@docflow.local", status: "DRAFT", conf: "INTERNAL", priority: "URGENT", ext: "pdf", mime: "application/pdf", size: 210000, tags: ["ด่วน"] },
    { title: "คู่มือความปลอดภัยระบบสารสนเทศ", desc: "แนวปฏิบัติด้าน IT Security", cat: "POLICY", folder: "นโยบายองค์กร", dept: "IT", owner: "editor@docflow.local", status: "APPROVED", conf: "INTERNAL", priority: "NORMAL", ext: "pdf", mime: "application/pdf", size: 1240000, tags: ["ปี 2026", "ต้นฉบับ"] },
    { title: "สัญญาเช่าสำนักงานชั้น 12", desc: "สัญญาเช่าพื้นที่สำนักงาน 3 ปี", cat: "CONTRACT", folder: "สัญญาปี 2026", dept: "LEGAL", owner: "reviewer@docflow.local", status: "APPROVED", conf: "RESTRICTED", priority: "HIGH", ext: "pdf", mime: "application/pdf", size: 680000, tags: ["ลับ", "อนุมัติแล้ว"], expiresInDays: 25 },
    { title: "รายงานสรุปการอบรมพนักงานใหม่", desc: "สรุปผลการปฐมนิเทศ", cat: "HRDOC", folder: "เอกสารทรัพยากรบุคคล", dept: "HR", owner: "editor@docflow.local", status: "PUBLISHED", conf: "PUBLIC", priority: "LOW", ext: "pdf", mime: "application/pdf", size: 445000, tags: [] },
  ];

  const createdDocIds: string[] = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const createdAt = new Date(now.getTime() - (docs.length - i) * 3 * 24 * 3600 * 1000);
    const docNumber = `DOC-2026-${String(i + 1).padStart(6, "0")}`;

    const created = await db.$transaction(async (tx) => {
      const version = { num: 1 };
      const doc = await tx.document.create({
        data: {
          organizationId: org.id,
          documentNumber: docNumber,
          title: d.title,
          description: d.desc,
          folderId: folders.get(d.folder),
          categoryId: cats.get(d.cat),
          ownerId: users.get(d.owner)!,
          departmentId: depts.get(d.dept),
          status: d.status,
          confidentialityLevel: d.conf,
          priority: d.priority,
          language: "th",
          issueDate: createdAt,
          effectiveDate: createdAt,
          expirationDate: d.expiresInDays ? new Date(now.getTime() + d.expiresInDays * 24 * 3600 * 1000) : null,
          searchText: searchTextOf([d.title, docNumber, d.desc, d.cat]),
          createdAt,
          updatedAt: createdAt,
          tags: { create: d.tags.map((t) => ({ tagId: tags.get(t)! })) },
        },
      });

      const ver = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: version.num,
          storageProvider: "LOCAL",
          storageKey: `seed/${doc.id}/v1.${d.ext}`,
          originalFilename: `${d.title}.${d.ext}`,
          storedFilename: `${doc.id}_v1.${d.ext}`,
          mimeType: d.mime,
          extension: d.ext,
          fileSize: BigInt(d.size),
          checksum: sha256(`${doc.id}-v1`),
          isCurrent: true,
          createdById: users.get(d.owner)!,
          ocrStatus: d.mime === "application/pdf" ? "COMPLETED" : "NOT_REQUIRED",
          extractedText: d.mime === "application/pdf" ? `${d.title} ${d.desc}` : null,
          createdAt,
        },
      });

      await tx.document.update({ where: { id: doc.id }, data: { currentVersionId: ver.id } });

      // เอกสารที่ APPROVED บางฉบับ มีเวอร์ชัน 2
      if (d.status === "APPROVED" && i % 2 === 0) {
        const ver2 = await tx.documentVersion.create({
          data: {
            documentId: doc.id,
            versionNumber: 2,
            storageProvider: "LOCAL",
            storageKey: `seed/${doc.id}/v2.${d.ext}`,
            originalFilename: `${d.title} (แก้ไข).${d.ext}`,
            storedFilename: `${doc.id}_v2.${d.ext}`,
            mimeType: d.mime,
            extension: d.ext,
            fileSize: BigInt(d.size + 12000),
            checksum: sha256(`${doc.id}-v2`),
            changeNote: "แก้ไขตามความเห็นผู้ตรวจสอบ",
            isCurrent: true,
            createdById: users.get(d.owner)!,
            createdAt: new Date(createdAt.getTime() + 24 * 3600 * 1000),
          },
        });
        await tx.documentVersion.update({ where: { id: ver.id }, data: { isCurrent: false } });
        await tx.document.update({ where: { id: doc.id }, data: { currentVersionId: ver2.id } });
      }

      return doc.id;
    });

    createdDocIds.push(created);

    // sequence tracking
    await db.documentSequence.upsert({
      where: { organizationId_scope: { organizationId: org.id, scope: "DOC-2026" } },
      create: { organizationId: org.id, scope: "DOC-2026", value: i + 1 },
      update: { value: i + 1 },
    });
  }

  // ── Comments ──
  console.log("  • สร้าง comments, favorites, recents...");
  const firstDoc = createdDocIds[0];
  const parentComment = await db.comment.create({
    data: {
      documentId: firstDoc,
      authorId: users.get("reviewer@docflow.local")!,
      body: "กรุณาตรวจสอบข้อ 3.2 เรื่องเงื่อนไขการชำระเงินอีกครั้ง",
    },
  });
  await db.comment.create({
    data: {
      documentId: firstDoc,
      authorId: users.get("reviewer@docflow.local")!,
      parentId: parentComment.id,
      body: "แก้ไขเรียบร้อยแล้วครับ",
    },
  });

  // ── Favorites / Recents ──
  await db.favorite.create({ data: { userId: users.get(adminEmail)!, documentId: createdDocIds[1] } });
  await db.favorite.create({ data: { userId: users.get(adminEmail)!, documentId: createdDocIds[5] } });
  for (let i = 0; i < 4; i++) {
    await db.recentDocument.create({
      data: {
        userId: users.get(adminEmail)!,
        documentId: createdDocIds[i],
        action: "VIEWED",
        viewedAt: new Date(now.getTime() - i * 3600 * 1000),
      },
    });
  }

  // ── Notifications ──
  console.log("  • สร้าง notifications...");
  await db.notification.createMany({
    data: [
      { organizationId: org.id, recipientId: users.get("approver@docflow.local")!, type: "APPROVAL_REQUESTED", title: "มีเอกสารรออนุมัติ", body: "รายงานงบการเงินไตรมาส 2/2026", link: `/documents/${createdDocIds[2]}` },
      { organizationId: org.id, recipientId: users.get("reviewer@docflow.local")!, type: "REVIEW_REQUESTED", title: "มีเอกสารรอตรวจสอบ", body: "แบบฟอร์มประเมินผลพนักงาน", link: `/documents/${createdDocIds[3]}` },
      { organizationId: org.id, recipientId: users.get(adminEmail)!, type: "DOCUMENT_EXPIRING", title: "เอกสารใกล้หมดอายุ", body: "สัญญาเช่าสำนักงานชั้น 12 จะหมดอายุใน 25 วัน", link: `/documents/${createdDocIds[6]}` },
    ],
  });

  // ── Audit logs ──
  console.log("  • สร้าง audit logs...");
  await db.auditLog.createMany({
    data: createdDocIds.slice(0, 5).map((id, idx) => ({
      organizationId: org.id,
      actorId: users.get(adminEmail)!,
      action: "document.created",
      entityType: "Document",
      entityId: id,
      metadata: { seeded: true },
      createdAt: new Date(now.getTime() - idx * 3600 * 1000),
    })),
  });

  console.log("✅ Seed สำเร็จ!");
  console.log(`   องค์กร: ${org.name}`);
  console.log(`   ผู้ใช้: ${seedUsers.length} คน (admin: ${adminEmail})`);
  console.log(`   เอกสาร: ${createdDocIds.length} ฉบับ`);
  console.log(`   หมวดหมู่: ${catData.length}, แผนก: ${deptData.length}, โฟลเดอร์: ${folders.size}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
