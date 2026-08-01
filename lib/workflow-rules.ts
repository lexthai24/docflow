// Workflow transition rules (pure, ไม่มี side-effect) — แยกออกมาเพื่อทดสอบได้ (สเปคหมวด 15, 32)

export type DocStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "EXPIRED"
  | "ARCHIVED";

// transition ที่อนุญาต: from → [to]
export const TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["CHANGES_REQUESTED", "PENDING_APPROVAL", "DRAFT"],
  CHANGES_REQUESTED: ["IN_REVIEW", "DRAFT"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"],
  APPROVED: ["PUBLISHED", "ARCHIVED"],
  REJECTED: ["DRAFT"],
  PUBLISHED: ["ARCHIVED", "EXPIRED"],
  EXPIRED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: DocStatus, to: DocStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<DocStatus, string> = {
  DRAFT: "ฉบับร่าง",
  IN_REVIEW: "กำลังตรวจสอบ",
  CHANGES_REQUESTED: "ขอแก้ไข",
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกปฏิเสธ",
  PUBLISHED: "เผยแพร่แล้ว",
  EXPIRED: "หมดอายุ",
  ARCHIVED: "จัดเก็บในคลัง",
};

/** เหตุผลจำเป็นสำหรับ REJECTED / CHANGES_REQUESTED */
export function decisionRequiresReason(
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
): boolean {
  return decision === "REJECTED" || decision === "CHANGES_REQUESTED";
}
