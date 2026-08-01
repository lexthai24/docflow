import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getMyWorkQueue } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { SimpleDocumentList } from "@/components/documents/simple-document-list";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = { title: "รออนุมัติ" };

export default async function ApprovalsPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.DOCUMENT_APPROVE)) redirect("/dashboard");
  const items = await getMyWorkQueue(user, "APPROVAL");
  return (
    <>
      <PageHeader title="รออนุมัติ" description="เอกสารที่มอบหมายให้คุณอนุมัติ"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "รออนุมัติ" }]} />
      <SimpleDocumentList items={items} emptyIcon={<CheckCircle2 />} emptyTitle="ไม่มีเอกสารรออนุมัติ"
        emptyDescription="เมื่อมีเอกสารถูกมอบหมายให้คุณอนุมัติ จะแสดงที่นี่" />
    </>
  );
}
