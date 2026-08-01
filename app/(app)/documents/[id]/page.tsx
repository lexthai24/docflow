import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { Calendar, Building2, FolderOpen, User, Clock, Lock, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import {
  getDocumentDetail,
  getDocumentComments,
  getDocumentTimeline,
  recordDocumentView,
} from "@/lib/services/document-detail";
import { NotFoundError } from "@/lib/errors";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge, ConfidentialityBadge, PriorityLabel, Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/misc";
import { DocumentActions } from "./document-actions";
import { DocumentPreview } from "./document-preview";
import { VersionsList } from "./versions-list";
import { CommentsSection } from "./comments-section";
import { PERMISSIONS } from "@/lib/permissions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser().catch(() => null);
  if (!user) return { title: "เอกสาร" };
  try {
    const doc = await getDocumentDetail(user, id);
    return { title: doc.title };
  } catch {
    return { title: "ไม่พบเอกสาร" };
  }
}

const ACCESS_RANK: Record<string, number> = {
  VIEW: 1, COMMENT: 2, EDIT_METADATA: 3, UPLOAD_VERSION: 4, DOWNLOAD: 5, SHARE: 6, APPROVE: 7, MANAGE: 8,
};
const hasLevel = (level: string | null, required: string) =>
  Boolean(level) && (ACCESS_RANK[level!] ?? 0) >= (ACCESS_RANK[required] ?? 99);

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  let doc;
  try {
    doc = await getDocumentDetail(user, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  // บันทึกการเปิดดู (fire and forget)
  await recordDocumentView(user, id);

  const canReview = user.permissions.has(PERMISSIONS.DOCUMENT_REVIEW);
  const canApprove = user.permissions.has(PERMISSIONS.DOCUMENT_APPROVE);
  const [comments, timeline] = await Promise.all([
    getDocumentComments(id, canReview || canApprove),
    getDocumentTimeline(user.organizationId, id),
  ]);

  const level = doc.access.level;
  const canDownload = hasLevel(level, "DOWNLOAD") && user.permissions.has(PERMISSIONS.DOCUMENT_DOWNLOAD);

  return (
    <>
      <PageHeader
        title={doc.title}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/dashboard" },
          { label: "เอกสาร", href: "/documents" },
          ...(doc.folderName && doc.folderId
            ? [{ label: doc.folderName, href: `/folders/${doc.folderId}` }]
            : []),
          { label: doc.documentNumber },
        ]}
        actions={
          <DocumentActions
            documentId={doc.id}
            status={doc.status}
            isFavorite={doc.isFavorite}
            canDownload={canDownload}
            canSubmit={doc.access.isOwner || user.permissions.has(PERMISSIONS.DOCUMENT_UPDATE)}
            canDecide={canReview || canApprove}
            canApprove={canApprove || canReview}
            canArchive={user.permissions.has(PERMISSIONS.DOCUMENT_ARCHIVE)}
            canDelete={user.permissions.has(PERMISSIONS.DOCUMENT_DELETE)}
          />
        }
      />

      {/* alerts */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={doc.status} />
        <ConfidentialityBadge level={doc.confidentialityLevel} />
        <PriorityLabel priority={doc.priority} />
        {doc.legalHold && (
          <Badge className="border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <ShieldAlert className="size-3" /> Legal Hold
          </Badge>
        )}
        {doc.isLocked && (
          <Badge className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Lock className="size-3" /> ล็อกโดย {doc.lockedByName}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-4 lg:col-span-2">
          {doc.currentVersion ? (
            <DocumentPreview
              documentId={doc.id}
              versionId={doc.currentVersion.id}
              mimeType={doc.currentVersion.mimeType}
              extension={doc.currentVersion.extension}
              filename={doc.currentVersion.originalFilename}
              fileSize={doc.currentVersion.fileSize}
              canDownload={canDownload}
            />
          ) : (
            <Card className="p-8">
              <EmptyState title="ยังไม่มีไฟล์" description="เอกสารนี้ยังไม่มีไฟล์แนบ" />
            </Card>
          )}

          <Card>
            <Tabs defaultValue="comments" className="p-5">
              <TabsList>
                <TabsTrigger value="comments">ความคิดเห็น ({comments.length})</TabsTrigger>
                <TabsTrigger value="versions">ประวัติเวอร์ชัน ({doc.versions.length})</TabsTrigger>
                <TabsTrigger value="timeline">ไทม์ไลน์</TabsTrigger>
              </TabsList>
              <TabsContent value="comments">
                <CommentsSection
                  documentId={doc.id}
                  comments={comments}
                  canComment={user.permissions.has(PERMISSIONS.COMMENT_CREATE) && hasLevel(level, "COMMENT")}
                />
              </TabsContent>
              <TabsContent value="versions">
                <VersionsList
                  documentId={doc.id}
                  versions={doc.versions}
                  canDownload={canDownload}
                  canRestore={user.permissions.has(PERMISSIONS.DOCUMENT_VERSION_RESTORE) && hasLevel(level, "UPLOAD_VERSION")}
                />
              </TabsContent>
              <TabsContent value="timeline">
                {timeline.length > 0 ? (
                  <ul className="space-y-3">
                    {timeline.map((t) => (
                      <li key={t.id} className="flex items-center gap-3">
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                        <span className="text-sm text-foreground">
                          {t.actor ? `${t.actor.firstName} ${t.actor.lastName}` : "ระบบ"}
                        </span>
                        <span className="text-sm text-muted-foreground">{translateAction(t.action)}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {formatDistanceToNow(t.createdAt, { addSuffix: true, locale: th })}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">ข้อมูลเอกสาร</h3>
            <dl className="space-y-3 text-sm">
              <InfoRow icon={<User />} label="เจ้าของ" value={doc.ownerName} />
              <InfoRow icon={<Building2 />} label="แผนก" value={doc.departmentName ?? "—"} />
              {doc.categoryName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground [&_svg]:size-4"><FolderOpen /></span>
                  <span className="text-muted-foreground">หมวดหมู่</span>
                  <span className="ml-auto flex items-center gap-1.5 font-medium text-foreground">
                    <span className="size-2 rounded-full" style={{ backgroundColor: doc.categoryColor ?? "#64748b" }} />
                    {doc.categoryName}
                  </span>
                </div>
              )}
              <InfoRow icon={<Clock />} label="สร้างเมื่อ" value={format(doc.createdAt, "d MMM yyyy", { locale: th })} />
              <InfoRow icon={<Clock />} label="แก้ไขล่าสุด" value={format(doc.updatedAt, "d MMM yyyy", { locale: th })} />
              {doc.effectiveDate && (
                <InfoRow icon={<Calendar />} label="วันที่มีผล" value={format(doc.effectiveDate, "d MMM yyyy", { locale: th })} />
              )}
              {doc.expirationDate && (
                <InfoRow icon={<Calendar />} label="วันหมดอายุ" value={format(doc.expirationDate, "d MMM yyyy", { locale: th })} danger />
              )}
            </dl>

            {doc.description && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">คำอธิบาย</p>
                <p className="text-sm text-foreground">{doc.description}</p>
              </div>
            )}

            {doc.tags.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">แท็ก</p>
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((t) => (
                    <Badge key={t.id} className="border-transparent bg-surface-muted text-foreground">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className={`ml-auto font-medium ${danger ? "text-danger" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function translateAction(action: string): string {
  const map: Record<string, string> = {
    "document.created": "สร้างเอกสาร",
    "document.viewed": "เปิดดูเอกสาร",
    "document.downloaded": "ดาวน์โหลด",
    "document.updated": "แก้ไข",
    "document.version_uploaded": "อัปโหลดเวอร์ชันใหม่",
    "document.version_restored": "กู้คืนเวอร์ชัน",
    "document.archived": "จัดเก็บเข้าคลัง",
    "workflow.submitted": "ส่งตรวจสอบ",
    "workflow.approved": "อนุมัติ",
    "workflow.rejected": "ปฏิเสธ",
    "workflow.changes_requested": "ขอแก้ไข",
    "comment.created": "แสดงความคิดเห็น",
  };
  return map[action] ?? action;
}
