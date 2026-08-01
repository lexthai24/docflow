import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tags } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { Icon } from "@/components/icon";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = { title: "หมวดหมู่และแท็ก" };

export default async function AdminCategoriesPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.SETTINGS_MANAGE)) redirect("/dashboard");

  const [categories, tags] = await Promise.all([
    db.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, color: true, icon: true, isActive: true,
        _count: { select: { documents: true, metadataDefs: true } },
      },
    }),
    db.tag.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, _count: { select: { documentTags: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="หมวดหมู่และแท็ก" description="จัดการหมวดหมู่เอกสารและแท็ก"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "หมวดหมู่" }]} />

      <div className="space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">หมวดหมู่ ({categories.length})</h2>
          {categories.length === 0 ? (
            <EmptyState icon={<Tags />} title="ยังไม่มีหมวดหมู่" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
                      <Icon name={c.icon ?? "Folder"} className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">{c.code} · {c._count.documents} เอกสาร</p>
                    </div>
                  </div>
                  {c._count.metadataDefs > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">{c._count.metadataDefs} ฟิลด์ metadata</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>แท็ก ({tags.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีแท็ก</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Badge key={t.id} className="border-border bg-surface-muted text-foreground">
                    {t.name}
                    <span className="text-muted-foreground">{t._count.documentTags}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
