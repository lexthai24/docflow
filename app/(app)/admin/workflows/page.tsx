import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GitBranch, SearchCheck, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = { title: "Workflow" };

export default async function AdminWorkflowsPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.WORKFLOW_MANAGE)) redirect("/dashboard");

  const templates = await db.workflowTemplate.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, description: true, isActive: true,
      steps: { orderBy: { order: "asc" }, select: { id: true, name: true, type: true, order: true } },
      _count: { select: { instances: true, categories: true } },
    },
  });

  return (
    <>
      <PageHeader title="Workflow" description="เทมเพลตการตรวจสอบและอนุมัติเอกสาร"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "Workflow" }]} />

      {templates.length === 0 ? (
        <EmptyState icon={<GitBranch />} title="ยังไม่มี Workflow" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {templates.map((wf) => (
            <Card key={wf.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{wf.name}</h3>
                  {wf.description && <p className="mt-0.5 text-sm text-muted-foreground">{wf.description}</p>}
                </div>
                <Badge className={wf.isActive ? "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "border-transparent bg-slate-100 text-slate-600"}>
                  {wf.isActive ? "ใช้งาน" : "ปิด"}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                {wf.steps.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {s.order}
                    </span>
                    {s.type === "REVIEW" ? <SearchCheck className="size-4 text-info" /> : <CheckCircle2 className="size-4 text-success" />}
                    <span className="text-foreground">{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {s.type === "REVIEW" ? "ตรวจสอบ" : "อนุมัติ"}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                ใช้กับ {wf._count.categories} หมวดหมู่ · {wf._count.instances} instance
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
