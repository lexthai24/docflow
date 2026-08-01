import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { ConflictError, NotFoundError } from "@/lib/errors";

// บริการโฟลเดอร์ (สเปคหมวด 7)

export interface FolderNode {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  documentCount: number;
  children: FolderNode[];
}

/** ต้นไม้โฟลเดอร์ทั้งองค์กร (ยังไม่ลบ) */
export async function getFolderTree(user: CurrentUser): Promise<FolderNode[]> {
  const folders = await db.folder.findMany({
    where: { organizationId: user.organizationId, deletedAt: null, archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      parentId: true,
      _count: { select: { documents: { where: { deletedAt: null } } } },
    },
  });

  const nodeMap = new Map<string, FolderNode>();
  for (const f of folders) {
    nodeMap.set(f.id, {
      id: f.id,
      name: f.name,
      color: f.color,
      icon: f.icon,
      parentId: f.parentId,
      documentCount: f._count.documents,
      children: [],
    });
  }

  const roots: FolderNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** breadcrumb จาก root ถึงโฟลเดอร์ปัจจุบัน */
export async function getFolderBreadcrumbs(
  organizationId: string,
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const crumbs: { id: string; name: string }[] = [];
  let current: string | null = folderId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    const folder: { id: string; name: string; parentId: string | null } | null =
      await db.folder.findFirst({
        where: { id: current, organizationId },
        select: { id: true, name: true, parentId: true },
      });
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    current = folder.parentId;
  }
  return crumbs;
}

/** ตรวจว่า targetParentId เป็นลูกหลานของ folderId หรือไม่ (กัน circular move) */
export async function isDescendant(
  organizationId: string,
  folderId: string,
  targetParentId: string,
): Promise<boolean> {
  if (folderId === targetParentId) return true;
  let current: string | null = targetParentId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    if (current === folderId) return true;
    const parent: { parentId: string | null } | null = await db.folder.findFirst({
      where: { id: current, organizationId },
      select: { parentId: true },
    });
    current = parent?.parentId ?? null;
  }
  return false;
}

/** สร้าง path string (materialized path) จาก parent */
export async function buildFolderPath(
  organizationId: string,
  parentId: string | null,
): Promise<string> {
  if (!parentId) return "/";
  const parent = await db.folder.findFirst({
    where: { id: parentId, organizationId },
    select: { path: true },
  });
  if (!parent) throw new NotFoundError("ไม่พบโฟลเดอร์ต้นทาง");
  return `${parent.path}${parentId}/`;
}

/** ตรวจชื่อซ้ำในโฟลเดอร์เดียวกัน */
export async function assertNoDuplicateName(
  organizationId: string,
  parentId: string | null,
  name: string,
  excludeId?: string,
): Promise<void> {
  const existing = await db.folder.findFirst({
    where: {
      organizationId,
      parentId,
      name,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new ConflictError(`มีโฟลเดอร์ชื่อ "${name}" อยู่แล้วในตำแหน่งนี้`);
}
