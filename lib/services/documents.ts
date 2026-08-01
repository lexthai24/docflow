import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/dal";
import { visibleDocumentsWhere } from "@/lib/auth/access-control";

// บริการรายการเอกสาร: server-side pagination/filter/sort + permission filter (สเปคหมวด 14, 34)

export interface DocumentListFilters {
  q?: string;
  status?: string;
  categoryId?: string;
  folderId?: string;
  confidentiality?: string;
  ownerId?: string;
  departmentId?: string;
  fileType?: string;
  favorite?: boolean;
  scope?: "all" | "mine" | "shared";
  page?: number;
  pageSize?: number;
  sortBy?: "updatedAt" | "createdAt" | "title" | "documentNumber" | "expirationDate";
  sortDir?: "asc" | "desc";
}

export interface DocumentListItem {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  confidentialityLevel: string;
  priority: string;
  categoryName: string | null;
  categoryColor: string | null;
  folderName: string | null;
  ownerName: string;
  departmentName: string | null;
  fileExtension: string | null;
  fileSize: number | null;
  updatedAt: Date;
  expirationDate: Date | null;
  isFavorite: boolean;
}

export interface DocumentListResult {
  items: DocumentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listDocuments(
  user: CurrentUser,
  filters: DocumentListFilters,
): Promise<DocumentListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
  const sortBy = filters.sortBy ?? "updatedAt";
  const sortDir = filters.sortDir ?? "desc";

  const visible = await visibleDocumentsWhere(user);
  const and: Prisma.DocumentWhereInput[] = [visible, { deletedAt: null, archivedAt: null }];

  if (filters.scope === "mine") and.push({ ownerId: user.id });
  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { documentNumber: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { searchText: { contains: filters.q.toLowerCase() } },
      ],
    });
  }
  if (filters.status) and.push({ status: filters.status as never });
  if (filters.categoryId) and.push({ categoryId: filters.categoryId });
  if (filters.folderId) and.push({ folderId: filters.folderId });
  if (filters.confidentiality) and.push({ confidentialityLevel: filters.confidentiality as never });
  if (filters.ownerId) and.push({ ownerId: filters.ownerId });
  if (filters.departmentId) and.push({ departmentId: filters.departmentId });
  if (filters.fileType) {
    and.push({ currentVersion: { extension: filters.fileType.toLowerCase() } });
  }
  if (filters.favorite) {
    and.push({ favorites: { some: { userId: user.id } } });
  }

  const where: Prisma.DocumentWhereInput = { AND: and };

  const orderBy: Prisma.DocumentOrderByWithRelationInput =
    sortBy === "title"
      ? { title: sortDir }
      : sortBy === "documentNumber"
        ? { documentNumber: sortDir }
        : sortBy === "createdAt"
          ? { createdAt: sortDir }
          : sortBy === "expirationDate"
            ? { expirationDate: sortDir }
            : { updatedAt: sortDir };

  const [total, rows] = await Promise.all([
    db.document.count({ where }),
    db.document.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
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
        favorites: { where: { userId: user.id }, select: { id: true } },
      },
    }),
  ]);

  return {
    items: rows.map((d) => ({
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
      isFavorite: d.favorites.length > 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** ตัวเลือกสำหรับ filter dropdowns (categories, folders, departments) */
export async function getFilterOptions(user: CurrentUser) {
  const [categories, departments] = await Promise.all([
    db.category.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
    db.department.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { categories, departments };
}
