import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getExpiringDocuments } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { SimpleDocumentList } from "@/components/documents/simple-document-list";

export const metadata: Metadata = { title: "ใกล้หมดอายุ" };

export default async function ExpiringPage() {
  const user = await requireUser();
  const items = await getExpiringDocuments(user);
  return (
    <>
      <PageHeader title="เอกสารใกล้หมดอายุ" description="เอกสารที่จะหมดอายุภายใน 30 วัน"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "ใกล้หมดอายุ" }]} />
      <SimpleDocumentList items={items} emptyIcon={<CalendarClock />} emptyTitle="ไม่มีเอกสารใกล้หมดอายุ" showExpiration />
    </>
  );
}
