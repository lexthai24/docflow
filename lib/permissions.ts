// รายการ Permission ทั้งหมด + การจับคู่ Role → Permission เริ่มต้น (สเปคหมวด 6)
// ใช้ทั้งฝั่ง server (ตรวจสิทธิ์) และ seed (สร้างข้อมูลเริ่มต้น)

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  DOCUMENT_CREATE: "document.create",
  DOCUMENT_READ: "document.read",
  DOCUMENT_UPDATE: "document.update",
  DOCUMENT_DELETE: "document.delete",
  DOCUMENT_RESTORE: "document.restore",
  DOCUMENT_DOWNLOAD: "document.download",
  DOCUMENT_SHARE: "document.share",
  DOCUMENT_APPROVE: "document.approve",
  DOCUMENT_REJECT: "document.reject",
  DOCUMENT_REVIEW: "document.review",
  DOCUMENT_ARCHIVE: "document.archive",
  DOCUMENT_VERSION_CREATE: "document.version.create",
  DOCUMENT_VERSION_RESTORE: "document.version.restore",

  FOLDER_CREATE: "folder.create",
  FOLDER_UPDATE: "folder.update",
  FOLDER_DELETE: "folder.delete",
  FOLDER_SHARE: "folder.share",

  COMMENT_CREATE: "comment.create",
  COMMENT_DELETE: "comment.delete",

  AUDIT_VIEW: "audit.view",
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",

  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
  DEPARTMENT_MANAGE: "department.manage",
  WORKFLOW_MANAGE: "workflow.manage",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: { key: PermissionKey; description: string }[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, description: "ดูภาพรวม Dashboard" },
  { key: PERMISSIONS.DOCUMENT_CREATE, description: "สร้าง/อัปโหลดเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_READ, description: "อ่านเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_UPDATE, description: "แก้ไขข้อมูลเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_DELETE, description: "ลบเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_RESTORE, description: "กู้คืนเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_DOWNLOAD, description: "ดาวน์โหลดเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_SHARE, description: "แชร์เอกสาร" },
  { key: PERMISSIONS.DOCUMENT_APPROVE, description: "อนุมัติเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_REJECT, description: "ปฏิเสธเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_REVIEW, description: "ตรวจสอบเอกสาร" },
  { key: PERMISSIONS.DOCUMENT_ARCHIVE, description: "จัดเก็บเอกสารเข้าคลัง" },
  { key: PERMISSIONS.DOCUMENT_VERSION_CREATE, description: "อัปโหลดเวอร์ชันใหม่" },
  { key: PERMISSIONS.DOCUMENT_VERSION_RESTORE, description: "กู้คืนเวอร์ชันเก่า" },
  { key: PERMISSIONS.FOLDER_CREATE, description: "สร้างโฟลเดอร์" },
  { key: PERMISSIONS.FOLDER_UPDATE, description: "แก้ไขโฟลเดอร์" },
  { key: PERMISSIONS.FOLDER_DELETE, description: "ลบโฟลเดอร์" },
  { key: PERMISSIONS.FOLDER_SHARE, description: "แชร์โฟลเดอร์" },
  { key: PERMISSIONS.COMMENT_CREATE, description: "แสดงความคิดเห็น" },
  { key: PERMISSIONS.COMMENT_DELETE, description: "ลบความคิดเห็น" },
  { key: PERMISSIONS.AUDIT_VIEW, description: "ดูประวัติการใช้งาน (Audit Log)" },
  { key: PERMISSIONS.REPORT_VIEW, description: "ดูรายงาน" },
  { key: PERMISSIONS.REPORT_EXPORT, description: "ส่งออกรายงาน" },
  { key: PERMISSIONS.USER_MANAGE, description: "จัดการผู้ใช้" },
  { key: PERMISSIONS.ROLE_MANAGE, description: "จัดการบทบาทและสิทธิ์" },
  { key: PERMISSIONS.DEPARTMENT_MANAGE, description: "จัดการแผนกและทีม" },
  { key: PERMISSIONS.WORKFLOW_MANAGE, description: "จัดการ Workflow" },
  { key: PERMISSIONS.SETTINGS_MANAGE, description: "จัดการตั้งค่าระบบ" },
];

// Role เริ่มต้น (สเปคหมวด 6)
export const ROLE_KEYS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  RECORDS_MANAGER: "RECORDS_MANAGER",
  DEPARTMENT_MANAGER: "DEPARTMENT_MANAGER",
  APPROVER: "APPROVER",
  REVIEWER: "REVIEWER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

const P = PERMISSIONS;

// สิทธิ์พื้นฐานที่เกือบทุก role มี
const BASE = [P.DASHBOARD_VIEW, P.DOCUMENT_READ, P.DOCUMENT_DOWNLOAD];

const EDITOR_PERMS = [
  ...BASE,
  P.DOCUMENT_CREATE,
  P.DOCUMENT_UPDATE,
  P.DOCUMENT_SHARE,
  P.DOCUMENT_VERSION_CREATE,
  P.FOLDER_CREATE,
  P.FOLDER_UPDATE,
  P.COMMENT_CREATE,
];

const REVIEWER_PERMS = [...EDITOR_PERMS, P.DOCUMENT_REVIEW];

const APPROVER_PERMS = [...REVIEWER_PERMS, P.DOCUMENT_APPROVE, P.DOCUMENT_REJECT];

const RECORDS_MANAGER_PERMS = [
  ...APPROVER_PERMS,
  P.DOCUMENT_ARCHIVE,
  P.DOCUMENT_DELETE,
  P.DOCUMENT_RESTORE,
  P.DOCUMENT_VERSION_RESTORE,
  P.FOLDER_DELETE,
  P.FOLDER_SHARE,
  P.AUDIT_VIEW,
  P.REPORT_VIEW,
  P.REPORT_EXPORT,
];

const DEPARTMENT_MANAGER_PERMS = [
  ...APPROVER_PERMS,
  P.DOCUMENT_ARCHIVE,
  P.FOLDER_SHARE,
  P.REPORT_VIEW,
  P.DEPARTMENT_MANAGE,
];

const ADMIN_PERMS = ALL_PERMISSIONS.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS: Record<
  RoleKey,
  { name: string; description: string; permissions: PermissionKey[] }
> = {
  SUPER_ADMIN: {
    name: "ผู้ดูแลระบบสูงสุด",
    description: "เข้าถึงและจัดการได้ทุกส่วนของระบบ",
    permissions: ADMIN_PERMS,
  },
  ADMIN: {
    name: "ผู้ดูแลระบบ",
    description: "จัดการผู้ใช้ สิทธิ์ และตั้งค่าระบบ",
    permissions: ADMIN_PERMS,
  },
  RECORDS_MANAGER: {
    name: "ผู้จัดการเอกสาร",
    description: "ดูแล retention, archive, การลบ และรายงาน",
    permissions: Array.from(new Set(RECORDS_MANAGER_PERMS)),
  },
  DEPARTMENT_MANAGER: {
    name: "ผู้จัดการแผนก",
    description: "อนุมัติและดูแลเอกสารในแผนก",
    permissions: Array.from(new Set(DEPARTMENT_MANAGER_PERMS)),
  },
  APPROVER: {
    name: "ผู้อนุมัติ",
    description: "อนุมัติหรือปฏิเสธเอกสาร",
    permissions: Array.from(new Set(APPROVER_PERMS)),
  },
  REVIEWER: {
    name: "ผู้ตรวจสอบ",
    description: "ตรวจสอบและขอแก้ไขเอกสาร",
    permissions: Array.from(new Set(REVIEWER_PERMS)),
  },
  EDITOR: {
    name: "ผู้แก้ไข",
    description: "สร้างและแก้ไขเอกสาร",
    permissions: Array.from(new Set(EDITOR_PERMS)),
  },
  VIEWER: {
    name: "ผู้อ่าน",
    description: "อ่านและดาวน์โหลดเอกสารที่มีสิทธิ์",
    permissions: BASE,
  },
};
