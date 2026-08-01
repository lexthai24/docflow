import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = { title: "แผนกและทีม" };

export default async function AdminDepartmentsPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.DEPARTMENT_MANAGE)) redirect("/dashboard");

  const departments = await db.department.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      isActive: true,
      manager: { select: { firstName: true, lastName: true } },
      _count: { select: { members: true, teams: true, documents: true } },
    },
  });

  return (
    <>
      <PageHeader title="แผนกและทีม" description={`จัดการโครงสร้างองค์กร (${departments.length} แผนก)`}
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "แผนกและทีม" }]} />

      {departments.length === 0 ? (
        <EmptyState icon={<Building2 />} title="ยังไม่มีแผนก" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{d.name}</h3>
                    <p className="text-xs text-muted-foreground">{d.code}</p>
                  </div>
                </div>
              </div>
              {d.description && <p className="mt-3 text-sm text-muted-foreground">{d.description}</p>}
              <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="size-4" /> {d._count.members} คน</span>
                <span>{d._count.teams} ทีม</span>
                <span>{d._count.documents} เอกสาร</span>
              </div>
              {d.manager && (
                <p className="mt-2 text-xs text-muted-foreground">
                  ผู้จัดการ: {d.manager.firstName} {d.manager.lastName}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
