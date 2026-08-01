import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Upload } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getFolderBreadcrumbs } from "@/lib/services/folders";
import { listDocuments, getFilterOptions, type DocumentListFilters } from "@/lib/services/documents";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DocumentTable } from "@/components/documents/document-table";
import { Icon } from "@/components/icon";
import { PERMISSIONS } from "@/lib/permissions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser().catch(() => null);
  if (!user) return { title: "โฟลเดอร์" };
  const folder = await db.folder.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { name: true },
  });
  return { title: folder?.name ?? "โฟลเดอร์" };
}

export default async function FolderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const sp = await searchParams;

  const folder = await db.folder.findFirst({
    where: { id, organizationId: user.organizationId, deletedAt: null },
    select: {
      id: true, name: true, description: true, color: true, icon: true,
      children: {
        where: { deletedAt: null, archivedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true, icon: true, _count: { select: { documents: { where: { deletedAt: null } } } } },
      },
    },
  });
  if (!folder) notFound();

  const crumbs = await getFolderBreadcrumbs(user.organizationId, id);
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const filters: DocumentListFilters = {
    q: get("q"),
    status: get("status"),
    folderId: id,
    page: get("page") ? Number(get("page")) : 1,
    sortBy: (get("sortBy") as DocumentListFilters["sortBy"]) ?? "updatedAt",
    sortDir: (get("sortDir") as "asc" | "desc") ?? "desc",
  };
  const [result, options] = await Promise.all([listDocuments(user, filters), getFilterOptions(user)]);

  return (
    <>
      <PageHeader
        title={folder.name}
        description={folder.description ?? undefined}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/dashboard" },
          { label: "โฟลเดอร์", href: "/folders" },
          ...crumbs.map((c) => ({ label: c.name, href: `/folders/${c.id}` })),
        ]}
        actions={
          user.permissions.has(PERMISSIONS.DOCUMENT_CREATE) ? (
            <Link href="/upload"><Button><Upload /> อัปโหลด</Button></Link>
          ) : undefined
        }
      />

      {folder.children.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">โฟลเดอร์ย่อย</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folder.children.map((c) => (
              <Link
                key={c.id}
                href={`/folders/${c.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-3 hover:bg-surface-muted transition-colors"
              >
                <Icon name={c.icon ?? "Folder"} className="size-6 shrink-0" style={{ color: c.color ?? "var(--muted-foreground)" }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c._count.documents} ไฟล์</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-foreground">เอกสารในโฟลเดอร์</h2>
      <DocumentTable result={result} options={options} />
    </>
  );
}
