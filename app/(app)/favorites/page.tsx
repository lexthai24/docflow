import type { Metadata } from "next";
import { Star } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getFavoriteDocuments } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { SimpleDocumentList } from "@/components/documents/simple-document-list";

export const metadata: Metadata = { title: "รายการโปรด" };

export default async function FavoritesPage() {
  const user = await requireUser();
  const items = await getFavoriteDocuments(user);
  return (
    <>
      <PageHeader title="รายการโปรด" description="เอกสารที่คุณทำเครื่องหมายไว้"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "รายการโปรด" }]} />
      <SimpleDocumentList items={items} emptyIcon={<Star />} emptyTitle="ยังไม่มีรายการโปรด"
        emptyDescription="กดไอคอนดาวบนเอกสารเพื่อเพิ่มเข้ารายการโปรด" />
    </>
  );
}
