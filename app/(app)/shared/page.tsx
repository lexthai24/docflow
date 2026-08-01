import type { Metadata } from "next";
import { Share2 } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getSharedWithMe } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { SimpleDocumentList } from "@/components/documents/simple-document-list";

export const metadata: Metadata = { title: "แชร์กับฉัน" };

export default async function SharedPage() {
  const user = await requireUser();
  const items = await getSharedWithMe(user);
  return (
    <>
      <PageHeader title="แชร์กับฉัน" description="เอกสารที่ผู้อื่นแชร์ให้คุณ"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "แชร์กับฉัน" }]} />
      <SimpleDocumentList items={items} emptyIcon={<Share2 />} emptyTitle="ยังไม่มีเอกสารที่แชร์กับคุณ" />
    </>
  );
}
