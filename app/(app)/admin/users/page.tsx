import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { PERMISSIONS } from "@/lib/permissions";
import { USER_STATUS_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "ผู้ใช้และสิทธิ์" };

export default async function AdminUsersPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.USER_MANAGE)) redirect("/dashboard");

  const users = await db.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      avatarUrl: true,
      status: true,
      lastLoginAt: true,
      department: { select: { name: true } },
      userRoles: { select: { role: { select: { name: true } } } },
    },
  });

  return (
    <>
      <PageHeader title="ผู้ใช้และสิทธิ์" description={`จัดการผู้ใช้ในองค์กร (${users.length} คน)`}
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "ผู้ใช้และสิทธิ์" }]} />

      {users.length === 0 ? (
        <EmptyState icon={<Users />} title="ยังไม่มีผู้ใช้" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">ผู้ใช้</th>
                <th className="px-4 py-3 font-medium">แผนก</th>
                <th className="px-4 py-3 font-medium">บทบาท</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium text-right">เข้าใช้ล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const st = USER_STATUS_LABELS[u.status] ?? { label: u.status, color: "" };
                return (
                  <tr key={u.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${u.firstName} ${u.lastName}`} src={u.avatarUrl} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.department?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.userRoles.map((ur, i) => (
                          <Badge key={i} className="border-transparent bg-accent text-accent-foreground">
                            {ur.role.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`border-transparent ${st.color}`}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {u.lastLoginAt ? format(u.lastLoginAt, "d MMM yyyy", { locale: th }) : "ยังไม่เคย"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
