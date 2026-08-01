import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { visibleDocumentsWhere } from "@/lib/auth/access-control";
import type { DocumentListItem } from "@/lib/services/documents";

// รายการเอกสารมุมมองพิเศษ: favorites, recent, review, approvals, expiring, archive, trash

function mapDoc(d: {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  confidentialityLevel: string;
  priority: string;
  updatedAt: Date;
  expirationDate: Date | null;
  category: { name: string; color: string } | null;
  folder: { name: string } | null;
  owner: { firstName: string; lastName: string };
  department: { name: string } | null;
  currentVersion: { extension: string; fileSize: bigint } | null;
}): DocumentListItem {
  return {
    id: d.id,
    documentNumber: d.documentNumber,
    title: d.title,
    status: d.status,
    confidentialityLevel: d.confidentialityLevel,
    priority: d.priority,
    categoryName: d.category?.name ?? null,
    categoryColor: d.category?.color ?? null,
    folderName: d.folder?.name ?? null,
    ownerName: `${d.owner.firstName} ${d.owner.lastName}`,
    departmentName: d.department?.name ?? null,
    fileExtension: d.currentVersion?.extension ?? null,
    fileSize: d.currentVersion?.fileSize ? Number(d.currentVersion.fileSize) : null,
    updatedAt: d.updatedAt,
    expirationDate: d.expirationDate,
    isFavorite: false,
  };
}

const listSelect = {
  id: true,
  documentNumber: true,
  title: true,
  status: true,
  confidentialityLevel: true,
  priority: true,
  updatedAt: true,
  expirationDate: true,
  category: { select: { name: true, color: true } },
  folder: { select: { name: true } },
  owner: { select: { firstName: true, lastName: true } },
  department: { select: { name: true } },
  currentVersion: { select: { extension: true, fileSize: true } },
} as const;

export async function getFavoriteDocuments(user: CurrentUser): Promise<DocumentListItem[]> {
  const visible = await visibleDocumentsWhere(user);
  const docs = await db.document.findMany({
    where: { AND: [visible, { deletedAt: null, favorites: { some: { userId: user.id } } }] },
    orderBy: { updatedAt: "desc" },
    select: listSelect,
  });
  return docs.map(mapDoc).map((d) => ({ ...d, isFavorite: true }));
}

export async function getRecentDocuments(user: CurrentUser): Promise<DocumentListItem[]> {
  const recents = await db.recentDocument.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: "desc" },
    take: 30,
    select: { document: { select: listSelect } },
  });
  return recents
    .map((r) => r.document)
    .filter(Boolean)
    .map(mapDoc);
}

export async function getExpiringDocuments(user: CurrentUser): Promise<DocumentListItem[]> {
  const visible = await visibleDocumentsWhere(user);
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const docs = await db.document.findMany({
    where: { AND: [visible, { deletedAt: null, expirationDate: { gte: now, lte: in30 } }] },
    orderBy: { expirationDate: "asc" },
    select: listSelect,
  });
  return docs.map(mapDoc);
}

export async function getArchivedDocuments(user: CurrentUser): Promise<DocumentListItem[]> {
  const visible = await visibleDocumentsWhere(user);
  const docs = await db.document.findMany({
    where: { AND: [visible, { deletedAt: null, status: "ARCHIVED" }] },
    orderBy: { archivedAt: "desc" },
    select: listSelect,
  });
  return docs.map(mapDoc);
}

export async function getTrashedDocuments(user: CurrentUser): Promise<DocumentListItem[]> {
  const visible = await visibleDocumentsWhere(user);
  const docs = await db.document.findMany({
    where: { AND: [visible, { deletedAt: { not: null } }] },
    orderBy: { deletedAt: "desc" },
    select: listSelect,
  });
  return docs.map(mapDoc);
}

/** เอกสารที่รอ user คนนี้ตรวจสอบ/อนุมัติ (จาก workflow assignment) */
export async function getMyWorkQueue(
  user: CurrentUser,
  stepType: "REVIEW" | "APPROVAL",
): Promise<DocumentListItem[]> {
  const assignments = await db.workflowAssignment.findMany({
    where: { assigneeId: user.id, completed: false, stepType },
    select: {
      instance: {
        select: { document: { select: listSelect } },
      },
    },
  });
  const seen = new Set<string>();
  const docs: DocumentListItem[] = [];
  for (const a of assignments) {
    const d = a.instance.document;
    if (d && !seen.has(d.id)) {
      seen.add(d.id);
      docs.push(mapDoc(d));
    }
  }
  return docs;
}

/** เอกสารที่แชร์กับ user (มี document ACL หรือ folder ACL ตรงกับ subject ของ user) */
export async function getSharedWithMe(user: CurrentUser): Promise<DocumentListItem[]> {
  const teams = await db.teamMember.findMany({ where: { userId: user.id }, select: { teamId: true } });
  const subjectOr = [
    { subjectType: "USER" as const, subjectId: user.id },
    ...(user.departmentId ? [{ subjectType: "DEPARTMENT" as const, subjectId: user.departmentId }] : []),
    ...teams.map((t) => ({ subjectType: "TEAM" as const, subjectId: t.teamId })),
    ...user.roleKeys.map((rk) => ({ subjectType: "ROLE" as const, subjectId: rk })),
  ];
  const docs = await db.document.findMany({
    where: {
      organizationId: user.organizationId,
      deletedAt: null,
      ownerId: { not: user.id },
      OR: [
        { permissions: { some: { isDeny: false, OR: subjectOr } } },
        { folder: { permissions: { some: { isDeny: false, OR: subjectOr } } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: listSelect,
  });
  return docs.map(mapDoc);
}
