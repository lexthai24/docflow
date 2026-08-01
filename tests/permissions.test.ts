import { describe, it, expect } from "vitest";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_KEYS,
} from "@/lib/permissions";

// สเปคหมวด 32: การทดสอบ Permission
describe("Role → Permission mapping", () => {
  it("VIEWER อ่านได้แต่แก้ไข/ลบไม่ได้", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.VIEWER.permissions;
    expect(perms).toContain(PERMISSIONS.DOCUMENT_READ);
    expect(perms).not.toContain(PERMISSIONS.DOCUMENT_UPDATE);
    expect(perms).not.toContain(PERMISSIONS.DOCUMENT_DELETE);
    expect(perms).not.toContain(PERMISSIONS.DOCUMENT_CREATE);
  });

  it("EDITOR แก้ไขและสร้างเอกสารได้ แต่อนุมัติไม่ได้", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.EDITOR.permissions;
    expect(perms).toContain(PERMISSIONS.DOCUMENT_UPDATE);
    expect(perms).toContain(PERMISSIONS.DOCUMENT_CREATE);
    expect(perms).not.toContain(PERMISSIONS.DOCUMENT_APPROVE);
  });

  it("REVIEWER ตรวจสอบได้ แต่อนุมัติไม่ได้", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.REVIEWER.permissions;
    expect(perms).toContain(PERMISSIONS.DOCUMENT_REVIEW);
    expect(perms).not.toContain(PERMISSIONS.DOCUMENT_APPROVE);
  });

  it("APPROVER อนุมัติและปฏิเสธได้", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.APPROVER.permissions;
    expect(perms).toContain(PERMISSIONS.DOCUMENT_APPROVE);
    expect(perms).toContain(PERMISSIONS.DOCUMENT_REJECT);
  });

  it("ADMIN มีสิทธิ์จัดการผู้ใช้และตั้งค่าระบบ", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.ADMIN.permissions;
    expect(perms).toContain(PERMISSIONS.USER_MANAGE);
    expect(perms).toContain(PERMISSIONS.SETTINGS_MANAGE);
    expect(perms).toContain(PERMISSIONS.ROLE_MANAGE);
  });

  it("SUPER_ADMIN มีสิทธิ์ครบทุกอย่าง", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN.permissions;
    expect(perms.length).toBe(ALL_PERMISSIONS.length);
  });

  it("RECORDS_MANAGER ดูแล archive/retention/audit ได้", () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.RECORDS_MANAGER.permissions;
    expect(perms).toContain(PERMISSIONS.DOCUMENT_ARCHIVE);
    expect(perms).toContain(PERMISSIONS.DOCUMENT_RESTORE);
    expect(perms).toContain(PERMISSIONS.AUDIT_VIEW);
  });

  it("สิทธิ์ที่ประกาศในทุก role ต้องอยู่ในรายการ ALL_PERMISSIONS (ไม่มี key ผิด)", () => {
    const valid = new Set(ALL_PERMISSIONS.map((p) => p.key));
    for (const role of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
      for (const p of role.permissions) {
        expect(valid.has(p)).toBe(true);
      }
    }
  });

  it("ไม่มี permission ซ้ำในแต่ละ role", () => {
    for (const role of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
      expect(new Set(role.permissions).size).toBe(role.permissions.length);
    }
  });

  it("มี role เริ่มต้นครบ 8 ตามสเปค", () => {
    expect(Object.keys(ROLE_KEYS)).toHaveLength(8);
    expect(Object.keys(DEFAULT_ROLE_PERMISSIONS)).toHaveLength(8);
  });
});
