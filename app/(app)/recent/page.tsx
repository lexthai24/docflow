import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getRecentDocuments } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { SimpleDocumentList } from "@/components/documents/simple-document-list";

export const metadata: Metadata = { title: "เปิดดูล่าสุด" };

export default async function RecentPage() {
  const user = await requireUser();
  const items = await getRecentDocuments(user);
  return (
    <>
      <PageHeader title="เปิดดูล่าสุด" description="เอกสารที่คุณเปิดดูล่าสุด"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "เปิดดูล่าสุด" }]} />
      <SimpleDocumentList items={items} emptyIcon={<Clock />} emptyTitle="ยังไม่มีประวัติการเปิดดู" />
    </>
  );
}
