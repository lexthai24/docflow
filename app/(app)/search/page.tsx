import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { listDocuments, getFilterOptions, type DocumentListFilters } from "@/lib/services/documents";
import { PageHeader } from "@/components/shell/page-header";
import { DocumentTable } from "@/components/documents/document-table";

export const metadata: Metadata = { title: "ค้นหาเอกสาร" };

export default async function SearchPage({
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

  const [result, options] = await Promise.all([listDocuments(user, filters), getFilterOptions(user)]);
  const q = get("q");

  return (
    <>
      <PageHeader
        title="ค้นหาเอกสาร"
        description={q ? `ผลการค้นหาสำหรับ "${q}" — พบ ${result.total} รายการ` : "ค้นหาและกรองเอกสารทั้งหมดที่คุณมีสิทธิ์เข้าถึง"}
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "ค้นหา" }]}
      />
      <DocumentTable result={result} options={options} />
    </>
  );
}
