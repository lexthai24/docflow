import { describe, it, expect } from "vitest";
import { canTransition, decisionRequiresReason, TRANSITIONS } from "@/lib/workflow-rules";

// สเปคหมวด 32: การทดสอบ Workflow
describe("Workflow state machine", () => {
  it("อนุญาต DRAFT → IN_REVIEW", () => {
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(true);
  });

  it("ห้าม APPROVED → DRAFT โดยตรง", () => {
    expect(canTransition("APPROVED", "DRAFT")).toBe(false);
  });

  it("ห้าม DRAFT → APPROVED ข้ามขั้นตอน", () => {
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
  });

  it("PENDING_APPROVAL สามารถไป APPROVED หรือ REJECTED", () => {
    expect(canTransition("PENDING_APPROVAL", "APPROVED")).toBe(true);
    expect(canTransition("PENDING_APPROVAL", "REJECTED")).toBe(true);
  });

  it("IN_REVIEW สามารถขอแก้ไข (CHANGES_REQUESTED) ได้", () => {
    expect(canTransition("IN_REVIEW", "CHANGES_REQUESTED")).toBe(true);
  });

  it("REJECTED กลับไป DRAFT ได้เพื่อแก้ไขและส่งใหม่", () => {
    expect(canTransition("REJECTED", "DRAFT")).toBe(true);
  });

  it("ARCHIVED เป็นสถานะสุดท้าย ไม่มี transition ออก", () => {
    expect(TRANSITIONS.ARCHIVED).toHaveLength(0);
    expect(canTransition("ARCHIVED", "DRAFT")).toBe(false);
  });

  it("APPROVED สามารถ PUBLISHED หรือ ARCHIVED", () => {
    expect(canTransition("APPROVED", "PUBLISHED")).toBe(true);
    expect(canTransition("APPROVED", "ARCHIVED")).toBe(true);
  });

  it("ทุก target ใน transition table เป็น status ที่ถูกต้อง", () => {
    const validStatuses = Object.keys(TRANSITIONS);
    for (const targets of Object.values(TRANSITIONS)) {
      for (const t of targets) {
        expect(validStatuses).toContain(t);
      }
    }
  });
});

describe("Decision reason requirement", () => {
  it("REJECTED ต้องมีเหตุผล", () => {
    expect(decisionRequiresReason("REJECTED")).toBe(true);
  });
  it("CHANGES_REQUESTED ต้องมีเหตุผล", () => {
    expect(decisionRequiresReason("CHANGES_REQUESTED")).toBe(true);
  });
  it("APPROVED ไม่บังคับเหตุผล", () => {
    expect(decisionRequiresReason("APPROVED")).toBe(false);
  });
});
