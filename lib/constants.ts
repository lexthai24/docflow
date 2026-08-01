// ป้ายภาษาไทย + สีสำหรับ enum ต่างๆ (ใช้ทั่วทั้ง UI)

export const DOCUMENT_STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: "ฉบับร่าง", color: "text-[var(--status-draft)] bg-[var(--status-draft)]/10 border-[var(--status-draft)]/20", dot: "bg-[var(--status-draft)]" },
  IN_REVIEW: { label: "กำลังตรวจสอบ", color: "text-[var(--status-review)] bg-[var(--status-review)]/10 border-[var(--status-review)]/20", dot: "bg-[var(--status-review)]" },
  CHANGES_REQUESTED: { label: "ขอแก้ไข", color: "text-[var(--status-pending)] bg-[var(--status-pending)]/10 border-[var(--status-pending)]/20", dot: "bg-[var(--status-pending)]" },
  PENDING_APPROVAL: { label: "รออนุมัติ", color: "text-[var(--status-pending)] bg-[var(--status-pending)]/10 border-[var(--status-pending)]/20", dot: "bg-[var(--status-pending)]" },
  APPROVED: { label: "อนุมัติแล้ว", color: "text-[var(--status-approved)] bg-[var(--status-approved)]/10 border-[var(--status-approved)]/20", dot: "bg-[var(--status-approved)]" },
  REJECTED: { label: "ถูกปฏิเสธ", color: "text-[var(--status-rejected)] bg-[var(--status-rejected)]/10 border-[var(--status-rejected)]/20", dot: "bg-[var(--status-rejected)]" },
  PUBLISHED: { label: "เผยแพร่แล้ว", color: "text-[var(--status-published)] bg-[var(--status-published)]/10 border-[var(--status-published)]/20", dot: "bg-[var(--status-published)]" },
  EXPIRED: { label: "หมดอายุ", color: "text-[var(--status-expired)] bg-[var(--status-expired)]/10 border-[var(--status-expired)]/20", dot: "bg-[var(--status-expired)]" },
  ARCHIVED: { label: "จัดเก็บในคลัง", color: "text-[var(--status-archived)] bg-[var(--status-archived)]/10 border-[var(--status-archived)]/20", dot: "bg-[var(--status-archived)]" },
};

export const CONFIDENTIALITY_LABELS: Record<string, { label: string; color: string }> = {
  PUBLIC: { label: "สาธารณะ", color: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800" },
  INTERNAL: { label: "ภายในองค์กร", color: "text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950" },
  CONFIDENTIAL: { label: "ลับ", color: "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950" },
  RESTRICTED: { label: "ลับที่สุด", color: "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950" },
};

export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  LOW: { label: "ต่ำ", color: "text-slate-500" },
  NORMAL: { label: "ปกติ", color: "text-slate-600 dark:text-slate-400" },
  HIGH: { label: "สูง", color: "text-amber-600" },
  URGENT: { label: "ด่วนที่สุด", color: "text-red-600 font-semibold" },
};

export const NOTIFICATION_LABELS: Record<string, string> = {
  DOCUMENT_SHARED: "แชร์เอกสาร",
  MENTIONED: "ถูกกล่าวถึง",
  REVIEW_REQUESTED: "รอตรวจสอบ",
  APPROVAL_REQUESTED: "รออนุมัติ",
  DOCUMENT_APPROVED: "เอกสารได้รับอนุมัติ",
  DOCUMENT_REJECTED: "เอกสารถูกปฏิเสธ",
  CHANGES_REQUESTED: "มีการขอแก้ไข",
  NEW_VERSION: "เวอร์ชันใหม่",
  DOCUMENT_EXPIRING: "เอกสารใกล้หมดอายุ",
  ACCESS_EXPIRING: "สิทธิ์ใกล้หมดอายุ",
  WORKFLOW_OVERDUE: "Workflow เกินกำหนด",
};

export const USER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "ใช้งาน", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300" },
  SUSPENDED: { label: "ระงับ", color: "text-red-600 bg-red-100 dark:bg-red-950 dark:text-red-300" },
  INVITED: { label: "รอตอบรับ", color: "text-amber-600 bg-amber-100 dark:bg-amber-950 dark:text-amber-300" },
};

// เมนู sidebar (สเปคหมวด 4)
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  permission?: string;
  badge?: "pendingReview" | "pendingApproval" | "expiring";
}
