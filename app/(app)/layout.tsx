import { requireUser, isAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { visibleDocumentsWhere } from "@/lib/auth/access-control";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_GROUPS } from "@/lib/navigation";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type { NavGroup } from "@/lib/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // กรองเมนูตาม permission (สเปคหมวด 4, 27)
  const navGroups: NavGroup[] = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || user.permissions.has(item.permission as never),
    ),
  })).filter((group) => group.items.length > 0);

  // ── นับ badge (งานที่ผู้ใช้ต้องทำ) ──
  const now = new Date();
  const in30days = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const visibleWhere = await visibleDocumentsWhere(user);

  const [pendingReview, pendingApproval, expiring, unreadCount] = await Promise.all([
    user.permissions.has("document.review" as never)
      ? db.workflowAssignment.count({
          where: { assigneeId: user.id, completed: false, stepType: "REVIEW" },
        })
      : Promise.resolve(0),
    user.permissions.has("document.approve" as never)
      ? db.workflowAssignment.count({
          where: { assigneeId: user.id, completed: false, stepType: "APPROVAL" },
        })
      : Promise.resolve(0),
    db.document.count({
      where: {
        ...visibleWhere,
        deletedAt: null,
        expirationDate: { gte: now, lte: in30days },
      },
    }),
    db.notification.count({ where: { recipientId: user.id, readAt: null } }),
  ]);

  const roleLabel =
    user.roleKeys
      .map((k) => DEFAULT_ROLE_PERMISSIONS[k as keyof typeof DEFAULT_ROLE_PERMISSIONS]?.name)
      .filter(Boolean)
      .join(", ") || (isAdmin(user) ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน");

  return (
    <AppShell
      navGroups={navGroups}
      badges={{ pendingReview, pendingApproval, expiring }}
      unreadCount={unreadCount}
      user={{
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        jobTitle: user.jobTitle,
        roleLabel,
      }}
    >
      {children}
    </AppShell>
  );
}
