import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { getFolderTree } from "@/lib/services/folders";
import { PageHeader } from "@/components/shell/page-header";
import { PERMISSIONS } from "@/lib/permissions";
import { FolderManager } from "./folder-manager";

export const metadata: Metadata = { title: "โฟลเดอร์" };

export default async function FoldersPage() {
  const user = await requireUser();
  const tree = await getFolderTree(user);

  return (
    <>
      <PageHeader
        title="โฟลเดอร์"
        description="จัดระเบียบเอกสารด้วยโครงสร้างโฟลเดอร์แบบลำดับชั้น"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "โฟลเดอร์" }]}
      />
      <FolderManager
        tree={tree}
        canCreate={user.permissions.has(PERMISSIONS.FOLDER_CREATE)}
        canUpdate={user.permissions.has(PERMISSIONS.FOLDER_UPDATE)}
        canDelete={user.permissions.has(PERMISSIONS.FOLDER_DELETE)}
      />
    </>
  );
}
