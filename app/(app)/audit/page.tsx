import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ScrollText } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/misc";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = { title: "ประวัติการใช้งาน" };

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "เข้าสู่ระบบ",
  "auth.logout": "ออกจากระบบ",
  "auth.login_failed": "เข้าสู่ระบบล้มเหลว",
  "document.created": "สร้างเอกสาร",
  "document.viewed": "เปิดดูเอกสาร",
  "document.downloaded": "ดาวน์โหลดเอกสาร",
  "document.updated": "แก้ไขเอกสาร",
  "document.deleted": "ลบเอกสาร",
  "document.restored": "กู้คืนเอกสาร",
  "document.archived": "จัดเก็บเข้าคลัง",
  "document.permanent_deleted": "ลบเอกสารถาวร",
  "document.version_uploaded": "อัปโหลดเวอร์ชัน",
  "document.version_restored": "กู้คืนเวอร์ชัน",
  "workflow.submitted": "ส่งตรวจสอบ",
  "workflow.approved": "อนุมัติเอกสาร",
  "workflow.rejected": "ปฏิเสธเอกสาร",
  "workflow.changes_requested": "ขอแก้ไข",
  "folder.created": "สร้างโฟลเดอร์",
  "comment.created": "แสดงความคิดเห็น",
  "settings.changed": "แก้ไขตั้งค่า",
  "user.created": "สร้างผู้ใช้",
  "user.updated": "แก้ไขผู้ใช้",
};

const PAGE_SIZE = 30;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (!user.permissions.has(PERMISSIONS.AUDIT_VIEW)) redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where: { organizationId: user.organizationId } }),
    db.auditLog.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        createdAt: true,
        actor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="ประวัติการใช้งาน" description="บันทึกกิจกรรมทั้งหมดในระบบ (Audit Log)"
        breadcrumbs={[{ label: "หน้าแรก", href: "/dashboard" }, { label: "ประวัติการใช้งาน" }]} />

      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="ยังไม่มีบันทึกกิจกรรม" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ผู้ใช้</th>
                  <th className="px-4 py-3 font-medium">การกระทำ</th>
                  <th className="px-4 py-3 font-medium">ประเภท</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium text-right">เวลา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "ระบบ"} size="xs" />
                        <span className="text-foreground">
                          {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "ระบบ"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground">{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.entityType}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {format(log.createdAt, "d MMM yyyy HH:mm", { locale: th })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>ทั้งหมด {total.toLocaleString()} รายการ · หน้า {page}/{totalPages}</span>
          </div>
        </>
      )}
    </>
  );
}
