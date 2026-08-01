import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getTrashedDocuments } from "@/lib/services/document-views";
import { PageHeader } from "@/components/shell/page-header";
import { PERMISSIONS } from "@/lib/permissions";
import { TrashList } from "./trash-list";

export const metadata: Metadata = { title: "ถังขยะ" };

export default async function TrashPage() {
  const user = await requireUser();
  const items = await getTrashedDocuments(user);
  return (
    <>
      <PageHeader title="ถังขยะ" description="เอกสารที่ถูกลบ สามารถกู้คืนได้"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "ถังขยะ" }]} />
      <TrashList items={items} canPermanentDelete={user.permissions.has(PERMISSIONS.DOCUMENT_DELETE)} />
    </>
  );
}
