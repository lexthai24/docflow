import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/permissions";
import { env } from "@/lib/env";
import { formatBytes } from "@/lib/utils";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "ตั้งค่าระบบ" };

export default async function AdminSettingsPage() {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.SETTINGS_MANAGE)) redirect("/dashboard");

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true, email: true, phone: true, address: true, primaryColor: true, timezone: true, locale: true },
  });
  if (!org) redirect("/dashboard");

  return (
    <>
      <PageHeader title="ตั้งค่าระบบ" description="จัดการการตั้งค่าองค์กรและระบบ"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "ตั้งค่าระบบ" }]} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลทั่วไป</CardTitle>
            <CardDescription>ชื่อองค์กร ข้อมูลติดต่อ และการแสดงผล</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm org={org} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>การอัปโหลดและจัดเก็บ</CardTitle>
            <CardDescription>ตั้งค่าผ่าน environment variables (ดู README)</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between rounded-md bg-surface-muted px-3 py-2">
                <dt className="text-muted-foreground">ขนาดไฟล์สูงสุด</dt>
                <dd className="font-medium text-foreground">{formatBytes(env.MAX_UPLOAD_SIZE)}</dd>
              </div>
              <div className="flex justify-between rounded-md bg-surface-muted px-3 py-2">
                <dt className="text-muted-foreground">Storage Driver</dt>
                <dd className="font-medium text-foreground">{env.STORAGE_DRIVER.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between rounded-md bg-surface-muted px-3 py-2">
                <dt className="text-muted-foreground">อายุ Session</dt>
                <dd className="font-medium text-foreground">{Math.round(env.SESSION_MAX_AGE / 86400)} วัน</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
