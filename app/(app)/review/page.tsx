import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getMyWorkQueue } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { SimpleDocumentList } from "@/components/documents/simple-document-list";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = { title: "รอตรวจสอบ" };

export default async function ReviewPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.DOCUMENT_REVIEW)) redirect("/dashboard");
  const items = await getMyWorkQueue(user, "REVIEW");
  return (
    <>
      <PageHeader title="รอตรวจสอบ" description="เอกสารที่มอบหมายให้คุณตรวจสอบ"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "รอตรวจสอบ" }]} />
      <SimpleDocumentList items={items} emptyIcon={<SearchCheck />} emptyTitle="ไม่มีเอกสารรอตรวจสอบ"
        emptyDescription="เมื่อมีเอกสารถูกมอบหมายให้คุณตรวจสอบ จะแสดงที่นี่" />
    </>
  );
}
