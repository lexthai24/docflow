import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getFilterOptions } from "@/lib/services/documents";
import { PageHeader } from "@/components/shell/page-header";
import { PERMISSIONS } from "@/lib/permissions";
import { env } from "@/lib/env";
import { UploadClient } from "./upload-client";

export const metadata: Metadata = { title: "อัปโหลดเอกสาร" };

export default async function UploadPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.DOCUMENT_CREATE)) {
    redirect("/documents");
  }

  const [{ categories }, folders] = await Promise.all([
    getFilterOptions(user),
    db.folder.findMany({
      where: { organizationId: user.organizationId, deletedAt: null, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="อัปโหลดเอกสาร"
        description="อัปโหลดได้หลายไฟล์พร้อมกัน พร้อมกำหนดโฟลเดอร์ หมวดหมู่ และระดับความลับ"
        breadcrumbs={[
          { label: "หน้าแรก", href: "/dashboard" },
          { label: "เอกสารทั้งหมด", href: "/documents" },
          { label: "อัปโหลด" },
        ]}
      />
      <UploadClient
        folders={folders}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        maxSize={env.MAX_UPLOAD_SIZE}
      />
    </>
  );
}
