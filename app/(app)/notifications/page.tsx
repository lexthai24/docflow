import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.notification.findMany({
    where: { recipientId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
  });

  return (
    <>
      <PageHeader title="การแจ้งเตือน" description="การแจ้งเตือนทั้งหมดของคุณ"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "การแจ้งเตือน" }]} />
      <NotificationsClient items={items} />
    </>
  );
}
