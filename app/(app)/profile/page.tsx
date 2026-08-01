import type { Metadata } from "next";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "โปรไฟล์ของฉัน" };

export default async function ProfilePage() {
  const user = await requireUser();
  const detail = await db.user.findUnique({
    where: { id: user.id },
    select: {
      createdAt: true, lastLoginAt: true, jobTitle: true,
      department: { select: { name: true } },
      userRoles: { select: { role: { select: { name: true } } } },
    },
  });

  return (
    <>
      <PageHeader title="โปรไฟล์ของฉัน"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "โปรไฟล์" }]} />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.fullName} src={user.avatarUrl} size="lg" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">{user.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {detail?.jobTitle && <p className="text-sm text-muted-foreground">{detail.jobTitle}</p>}
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">แผนก</dt>
              <dd className="font-medium text-foreground">{detail?.department?.name ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">บทบาท</dt>
              <dd className="flex flex-wrap gap-1">
                {detail?.userRoles.map((ur, i) => (
                  <Badge key={i} className="border-transparent bg-accent text-accent-foreground">{ur.role.name}</Badge>
                ))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">เข้าใช้ล่าสุด</dt>
              <dd className="font-medium text-foreground">
                {detail?.lastLoginAt ? format(detail.lastLoginAt, "d MMM yyyy HH:mm", { locale: th }) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">สมาชิกตั้งแต่</dt>
              <dd className="font-medium text-foreground">
                {detail?.createdAt ? format(detail.createdAt, "d MMM yyyy", { locale: th }) : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </>
  );
}
