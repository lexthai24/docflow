import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "การตั้งค่าส่วนตัว" };

export default async function PreferencesPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="การตั้งค่าส่วนตัว" description="ปรับแต่งการแสดงผลของคุณ"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "การตั้งค่าส่วนตัว" }]} />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>ธีมและการแสดงผล</CardTitle>
          <CardDescription>เลือกโหมดสีที่คุณต้องการ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">โหมดสี</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
