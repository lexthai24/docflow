import { PERMISSIONS } from "@/lib/permissions";
import type { NavItem } from "@/lib/constants";

// เมนู sidebar แบ่งกลุ่ม (สเปคหมวด 4)
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "ทั่วไป",
    items: [
      { href: "/dashboard", label: "ภาพรวม", icon: "LayoutDashboard", permission: PERMISSIONS.DASHBOARD_VIEW },
      { href: "/documents", label: "เอกสารทั้งหมด", icon: "Files" },
      { href: "/documents/mine", label: "เอกสารของฉัน", icon: "User" },
      { href: "/shared", label: "แชร์กับฉัน", icon: "Share2" },
      { href: "/favorites", label: "รายการโปรด", icon: "Star" },
      { href: "/recent", label: "เปิดดูล่าสุด", icon: "Clock" },
    ],
  },
  {
    label: "งานของฉัน",
    items: [
      { href: "/review", label: "รอตรวจสอบ", icon: "SearchCheck", permission: PERMISSIONS.DOCUMENT_REVIEW, badge: "pendingReview" },
      { href: "/approvals", label: "รออนุมัติ", icon: "CheckCircle2", permission: PERMISSIONS.DOCUMENT_APPROVE, badge: "pendingApproval" },
      { href: "/expiring", label: "ใกล้หมดอายุ", icon: "CalendarClock", badge: "expiring" },
    ],
  },
  {
    label: "คลังเอกสาร",
    items: [
      { href: "/folders", label: "โฟลเดอร์", icon: "FolderTree" },
      { href: "/archive", label: "คลังเอกสาร", icon: "Archive", permission: PERMISSIONS.DOCUMENT_ARCHIVE },
      { href: "/trash", label: "ถังขยะ", icon: "Trash2" },
    ],
  },
  {
    label: "รายงานและระบบ",
    items: [
      { href: "/reports", label: "รายงาน", icon: "BarChart3", permission: PERMISSIONS.REPORT_VIEW },
      { href: "/audit", label: "ประวัติการใช้งาน", icon: "ScrollText", permission: PERMISSIONS.AUDIT_VIEW },
    ],
  },
  {
    label: "ผู้ดูแลระบบ",
    items: [
      { href: "/admin/users", label: "ผู้ใช้และสิทธิ์", icon: "Users", permission: PERMISSIONS.USER_MANAGE },
      { href: "/admin/departments", label: "แผนกและทีม", icon: "Building2", permission: PERMISSIONS.DEPARTMENT_MANAGE },
      { href: "/admin/categories", label: "หมวดหมู่", icon: "Tags", permission: PERMISSIONS.SETTINGS_MANAGE },
      { href: "/admin/workflows", label: "Workflow", icon: "GitBranch", permission: PERMISSIONS.WORKFLOW_MANAGE },
      { href: "/admin/settings", label: "ตั้งค่าระบบ", icon: "Settings", permission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
];
