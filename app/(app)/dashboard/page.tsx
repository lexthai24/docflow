import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import {
  Files,
  Upload,
  SearchCheck,
  CheckCircle2,
  CalendarClock,
  HardDrive,
  Users,
  Activity,
  ArrowRight,
} from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getDashboardData } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { BarChart, DonutChart, HorizontalBars } from "@/components/charts";
import { formatBytes } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "ภาพรวม" };

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#64748b",
  IN_REVIEW: "#2563eb",
  CHANGES_REQUESTED: "#d97706",
  PENDING_APPROVAL: "#d97706",
  APPROVED: "#059669",
  REJECTED: "#dc2626",
  PUBLISHED: "#0891b2",
  EXPIRED: "#991b1b",
  ARCHIVED: "#7c3aed",
};

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className="flex size-10 items-center justify-center rounded-lg [&_svg]:size-5"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  const { stats } = data;

  return (
    <>
      <PageHeader
        title={`สวัสดี, ${user.firstName}`}
        description="ภาพรวมเอกสารและกิจกรรมในระบบ"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Files />} label="เอกสารทั้งหมด" value={stats.totalDocuments.toLocaleString()} accent="#1e3a8a" />
        <StatCard icon={<Upload />} label="อัปโหลดเดือนนี้" value={stats.uploadedThisMonth.toLocaleString()} accent="#0891b2" />
        <StatCard icon={<SearchCheck />} label="รอตรวจสอบ" value={stats.pendingReview} hint="งานของฉัน" accent="#2563eb" />
        <StatCard icon={<CheckCircle2 />} label="รออนุมัติ" value={stats.pendingApproval} hint="งานของฉัน" accent="#d97706" />
        <StatCard icon={<CalendarClock />} label="ใกล้หมดอายุ" value={stats.expiringSoon} hint="ภายใน 30 วัน" accent="#dc2626" />
        <StatCard icon={<HardDrive />} label="พื้นที่จัดเก็บ" value={formatBytes(stats.storageUsedBytes)} accent="#7c3aed" />
        <StatCard icon={<Users />} label="ผู้ใช้งาน" value={stats.totalUsers} accent="#059669" />
        <StatCard icon={<Activity />} label="กิจกรรม 7 วัน" value={stats.activity7d} accent="#db2777" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>จำนวนเอกสารตามเดือน</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={data.byMonth.map((m) => ({ label: m.month, value: m.count }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>เอกสารตามสถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byStatus.length > 0 ? (
              <DonutChart
                data={data.byStatus.map((s) => ({
                  label: DOCUMENT_STATUS_LABELS[s.status]?.label ?? s.status,
                  value: s.count,
                  color: STATUS_COLORS[s.status] ?? "#64748b",
                }))}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>เอกสารตามแผนก</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byDepartment.length > 0 ? (
              <HorizontalBars data={data.byDepartment.map((d) => ({ label: d.name, value: d.count }))} />
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ประเภทไฟล์</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byFileType.length > 0 ? (
              <HorizontalBars
                data={data.byFileType.map((d, i) => ({
                  label: d.type,
                  value: d.count,
                  color: ["#1e3a8a", "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777"][i % 6],
                }))}
              />
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent docs + activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>เอกสารล่าสุด</CardTitle>
            <Link href="/documents" className="text-sm text-primary hover:underline flex items-center gap-1">
              ดูทั้งหมด <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentDocuments.length > 0 ? (
              <ul className="divide-y divide-border">
                {data.recentDocuments.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.documentNumber} · {doc.ownerName}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5">
                <EmptyState icon={<Files />} title="ยังไม่มีเอกสาร" description="เริ่มต้นด้วยการอัปโหลดเอกสารแรกของคุณ" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length > 0 ? (
              <ul className="divide-y divide-border">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        <span className="font-medium">{a.actorName ?? "ระบบ"}</span>{" "}
                        <span className="text-muted-foreground">{translateAction(a.action)}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(a.createdAt, { addSuffix: true, locale: th })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function translateAction(action: string): string {
  const map: Record<string, string> = {
    "document.created": "สร้างเอกสาร",
    "document.viewed": "เปิดดูเอกสาร",
    "document.downloaded": "ดาวน์โหลดเอกสาร",
    "document.updated": "แก้ไขเอกสาร",
    "document.version_uploaded": "อัปโหลดเวอร์ชันใหม่",
    "workflow.submitted": "ส่งตรวจสอบ",
    "workflow.approved": "อนุมัติเอกสาร",
    "workflow.rejected": "ปฏิเสธเอกสาร",
    "auth.login": "เข้าสู่ระบบ",
    "folder.created": "สร้างโฟลเดอร์",
    "comment.created": "แสดงความคิดเห็น",
  };
  return map[action] ?? action;
}
