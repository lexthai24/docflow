import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { listDocuments, getFilterOptions, type DocumentListFilters } from "@/lib/services/documents";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/permissions";
import { DocumentTable } from "@/components/documents/document-table";

export const metadata: Metadata = { title: "เอกสารทั้งหมด" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const filters: DocumentListFilters = {
    q: get("q"),
    status: get("status"),
    categoryId: get("categoryId"),
    confidentiality: get("confidentiality"),
    departmentId: get("departmentId"),
    fileType: get("fileType"),
    page: get("page") ? Number(get("page")) : 1,
    sortBy: (get("sortBy") as DocumentListFilters["sortBy"]) ?? "updatedAt",
    sortDir: (get("sortDir") as "asc" | "desc") ?? "desc",
  };

  const [result, options] = await Promise.all([
    listDocuments(user, filters),
    getFilterOptions(user),
  ]);

  return (
    <>
      <PageHeader
        title="เอกสารทั้งหมด"
        description="ค้นหา กรอง และจัดการเอกสารทั้งหมดที่คุณมีสิทธิ์เข้าถึง"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "เอกสารทั้งหมด" }]}
        actions={
          user.permissions.has(PERMISSIONS.DOCUMENT_CREATE) ? (
            <Link href="/upload">
              <Button>
                <Upload /> อัปโหลดเอกสาร
              </Button>
            </Link>
          ) : undefined
        }
      />
      <DocumentTable result={result} options={options} />
    </>
  );
}
