import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { resolveDocumentAccess, type DocAccess } from "@/lib/auth/access-control";
import { NotFoundError } from "@/lib/errors";

// รายละเอียดเอกสาร (สเปคหมวด 8)

export interface DocumentDetail {
  id: string;
  documentNumber: string;
  title: string;
  description: string | null;
  status: string;
  confidentialityLevel: string;
  priority: string;
  language: string;
  issueDate: Date | null;
  effectiveDate: Date | null;
  expirationDate: Date | null;
  reviewDate: Date | null;
  legalHold: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerName: string;
  ownerId: string;
  departmentName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  folderId: string | null;
  folderName: string | null;
  tags: { id: string; name: string; color: string }[];
  isFavorite: boolean;
  isLocked: boolean;
  lockedByName: string | null;
  currentVersion: {
    id: string;
    versionNumber: number;
    originalFilename: string;
    mimeType: string;
    extension: string;
    fileSize: number;
  } | null;
  versions: {
    id: string;
    versionNumber: number;
    originalFilename: string;
    fileSize: number;
    changeNote: string | null;
    createdByName: string;
    createdAt: Date;
    isCurrent: boolean;
  }[];
  access: { level: DocAccess | null; isOwner: boolean };
}

export async function getDocumentDetail(
  user: CurrentUser,
  documentId: string,
): Promise<DocumentDetail> {
  const access = await resolveDocumentAccess(user, documentId);
  if (!access.allowed) throw new NotFoundError("ไม่พบเอกสารหรือคุณไม่มีสิทธิ์เข้าถึง");

  const doc = await db.document.findFirst({
    where: { id: documentId, organizationId: user.organizationId, deletedAt: null },
    select: {
      id: true,
      documentNumber: true,
      title: true,
      description: true,
      status: true,
      confidentialityLevel: true,
      priority: true,
      language: true,
      issueDate: true,
      effectiveDate: true,
      expirationDate: true,
      reviewDate: true,
      legalHold: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
      owner: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
      category: { select: { name: true, color: true } },
      folder: { select: { id: true, name: true } },
      currentVersionId: true,
      tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
      favorites: { where: { userId: user.id }, select: { id: true } },
      lock: { select: { lockedBy: { select: { firstName: true, lastName: true } } } },
      versions: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          originalFilename: true,
          mimeType: true,
          extension: true,
          fileSize: true,
          changeNote: true,
          isCurrent: true,
          createdAt: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!doc) throw new NotFoundError("ไม่พบเอกสาร");

  const current = doc.versions.find((v) => v.id === doc.currentVersionId) ?? doc.versions[0] ?? null;

  return {
    id: doc.id,
    documentNumber: doc.documentNumber,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    confidentialityLevel: doc.confidentialityLevel,
    priority: doc.priority,
    language: doc.language,
    issueDate: doc.issueDate,
    effectiveDate: doc.effectiveDate,
    expirationDate: doc.expirationDate,
    reviewDate: doc.reviewDate,
    legalHold: doc.legalHold,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ownerName: `${doc.owner.firstName} ${doc.owner.lastName}`,
    ownerId: doc.ownerId,
    departmentName: doc.department?.name ?? null,
    categoryName: doc.category?.name ?? null,
    categoryColor: doc.category?.color ?? null,
    folderId: doc.folder?.id ?? null,
    folderName: doc.folder?.name ?? null,
    tags: doc.tags.map((t) => t.tag),
    isFavorite: doc.favorites.length > 0,
    isLocked: Boolean(doc.lock),
    lockedByName: doc.lock ? `${doc.lock.lockedBy.firstName} ${doc.lock.lockedBy.lastName}` : null,
    currentVersion: current
      ? {
          id: current.id,
          versionNumber: current.versionNumber,
          originalFilename: current.originalFilename,
          mimeType: current.mimeType,
          extension: current.extension,
          fileSize: Number(current.fileSize),
        }
      : null,
    versions: doc.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      originalFilename: v.originalFilename,
      fileSize: Number(v.fileSize),
      changeNote: v.changeNote,
      createdByName: `${v.createdBy.firstName} ${v.createdBy.lastName}`,
      createdAt: v.createdAt,
      isCurrent: v.isCurrent,
    })),
    access: { level: access.level, isOwner: access.isOwner },
  };
}

/** บันทึกการเปิดดู (recent) + audit */
export async function recordDocumentView(user: CurrentUser, documentId: string): Promise<void> {
  await db.recentDocument.upsert({
    where: { userId_documentId: { userId: user.id, documentId } },
    create: { userId: user.id, documentId, action: "VIEWED" },
    update: { viewedAt: new Date(), action: "VIEWED" },
  });
}

export async function getDocumentComments(documentId: string, includeInternal: boolean) {
  const comments = await db.comment.findMany({
    where: {
      documentId,
      deletedAt: null,
      parentId: null,
      ...(includeInternal ? {} : { isInternal: false }),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      isInternal: true,
      resolvedAt: true,
      editedAt: true,
      createdAt: true,
      author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      replies: {
        where: { deletedAt: null, ...(includeInternal ? {} : { isInternal: false }) },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          editedAt: true,
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
  });
  return comments;
}

/** timeline จาก audit log ของเอกสาร */
export async function getDocumentTimeline(organizationId: string, documentId: string) {
  return db.auditLog.findMany({
    where: { organizationId, entityType: "Document", entityId: documentId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      action: true,
      createdAt: true,
      actor: { select: { firstName: true, lastName: true } },
    },
  });
}
