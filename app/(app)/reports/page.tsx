import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { visibleDocumentsWhere } from "@/lib/auth/access-control";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HorizontalBars, DonutChart } from "@/components/charts";
import { PERMISSIONS } from "@/lib/permissions";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = { title: "รายงาน" };

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#64748b", IN_REVIEW: "#2563eb", CHANGES_REQUESTED: "#d97706", PENDING_APPROVAL: "#d97706",
  APPROVED: "#059669", REJECTED: "#dc2626", PUBLISHED: "#0891b2", EXPIRED: "#991b1b", ARCHIVED: "#7c3aed",
};

export default async function ReportsPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.REPORT_VIEW)) redirect("/dashboard");

  const visible = await visibleDocumentsWhere(user);
  const active = { ...visible, deletedAt: null };

  const [byStatus, byCategory, byDept, storageAgg, totalDocs, approvedInstances] = await Promise.all([
    db.document.groupBy({ by: ["status"], where: active, _count: { _all: true } }),
    db.document.groupBy({ by: ["categoryId"], where: active, _count: { _all: true } }),
    db.document.groupBy({ by: ["departmentId"], where: active, _count: { _all: true } }),
    db.documentVersion.aggregate({ where: { isCurrent: true }, _sum: { fileSize: true } }),
    db.document.count({ where: active }),
    db.workflowInstance.findMany({
      where: { status: "APPROVED", completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
      take: 200,
    }),
  ]);

  const catIds = byCategory.map((c) => c.categoryId).filter((x): x is string => Boolean(x));
  const deptIds = byDept.map((d) => d.departmentId).filter((x): x is string => Boolean(x));
  const [cats, depts] = await Promise.all([
    db.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, color: true } }),
    db.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } }),
  ]);
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));

  // avg approval time (ชั่วโมง)
  const avgApprovalHours =
    approvedInstances.length > 0
      ? approvedInstances.reduce((s, i) => s + (i.completedAt!.getTime() - i.createdAt.getTime()), 0) /
        approvedInstances.length /
        (1000 * 3600)
      : 0;

  return (
    <>
      <PageHeader title="รายงาน" description="สรุปข้อมูลเชิงสถิติของเอกสารในระบบ"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "รายงาน" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">เอกสารทั้งหมด</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalDocs.toLocaleString()}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">พื้นที่จัดเก็บ</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatBytes(storageAgg._sum.fileSize ? Number(storageAgg._sum.fileSize) : 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">เวลาอนุมัติเฉลี่ย</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {avgApprovalHours > 0 ? `${avgApprovalHours.toFixed(1)} ชม.` : "—"}
          </p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>เอกสารตามสถานะ</CardTitle></CardHeader>
          <CardContent>
            {byStatus.length > 0 ? (
              <DonutChart data={byStatus.map((s) => ({
                label: DOCUMENT_STATUS_LABELS[s.status]?.label ?? s.status,
                value: s._count._all,
                color: STATUS_COLORS[s.status] ?? "#64748b",
              }))} />
            ) : <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>เอกสารตามหมวดหมู่</CardTitle></CardHeader>
          <CardContent>
            {byCategory.length > 0 ? (
              <HorizontalBars data={byCategory
                .map((c) => ({
                  label: c.categoryId ? catMap.get(c.categoryId)?.name ?? "ไม่ระบุ" : "ไม่ระบุ",
                  value: c._count._all,
                  color: c.categoryId ? catMap.get(c.categoryId)?.color : undefined,
                }))
                .sort((a, b) => b.value - a.value)} />
            ) : <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>เอกสารตามแผนก</CardTitle></CardHeader>
          <CardContent>
            {byDept.length > 0 ? (
              <HorizontalBars data={byDept
                .map((d) => ({
                  label: d.departmentId ? deptMap.get(d.departmentId) ?? "ไม่ระบุ" : "ไม่ระบุ",
                  value: d._count._all,
                }))
                .sort((a, b) => b.value - a.value)} />
            ) : <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
