import type { Metadata } from "next";
import { Archive } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getArchivedDocuments } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { SimpleDocumentList } from "@/components/documents/simple-document-list";

export const metadata: Metadata = { title: "คลังเอกสาร" };

export default async function ArchivePage() {
  const user = await requireUser();
  const items = await getArchivedDocuments(user);
  return (
    <>
      <PageHeader title="คลังเอกสาร" description="เอกสารที่จัดเก็บเข้าคลัง"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "คลังเอกสาร" }]} />
      <SimpleDocumentList items={items} emptyIcon={<Archive />} emptyTitle="คลังเอกสารว่างเปล่า" />
    </>
  );
}
