import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/dal";
import { isAdmin } from "@/lib/auth/dal";

// ── ตัวแก้สิทธิ์ระดับเอกสาร/โฟลเดอร์ (สเปคหมวด 17, 27) ──
// รวม: owner, department, role, folder ACL (สืบทอด), document ACL, explicit deny
// ทุกการตรวจสอบเกิดฝั่ง server — ห้ามพึ่งการซ่อนปุ่มใน UI

// ลำดับความสามารถของ AccessLevel (มากขึ้น = สิทธิ์สูงขึ้น)
const ACCESS_RANK: Record<string, number> = {
  VIEW: 1,
  COMMENT: 2,
  EDIT_METADATA: 3,
  UPLOAD_VERSION: 4,
  DOWNLOAD: 5,
  SHARE: 6,
  APPROVE: 7,
  MANAGE: 8,
};

export type DocAccess =
  | "VIEW"
  | "COMMENT"
  | "EDIT_METADATA"
  | "UPLOAD_VERSION"
  | "DOWNLOAD"
  | "SHARE"
  | "APPROVE"
  | "MANAGE";

/** subject ที่ user นี้ตรงกับ (สำหรับจับคู่ ACL) */
async function subjectMatchers(user: CurrentUser): Promise<Set<string>> {
  const set = new Set<string>();
  set.add(`USER:${user.id}`);
  if (user.departmentId) set.add(`DEPARTMENT:${user.departmentId}`);
  for (const rk of user.roleKeys) set.add(`ROLE:${rk}`);
  const teams = await db.teamMember.findMany({
    where: { userId: user.id },
    select: { teamId: true },
  });
  for (const t of teams) set.add(`TEAM:${t.teamId}`);
  return set;
}

interface AclRow {
  subjectType: string;
  subjectId: string;
  accessLevel: string;
  isDeny: boolean;
  expiresAt: Date | null;
}

function effectiveLevelFromAcls(
  acls: AclRow[],
  matchers: Set<string>,
): { level: number; denied: boolean } {
  let maxGrant = 0;
  let denied = false;
  const now = Date.now();
  for (const acl of acls) {
    if (acl.expiresAt && acl.expiresAt.getTime() < now) continue;
    const key = `${acl.subjectType}:${acl.subjectId}`;
    if (!matchers.has(key)) continue;
    if (acl.isDeny) {
      denied = true;
    } else {
      maxGrant = Math.max(maxGrant, ACCESS_RANK[acl.accessLevel] ?? 0);
    }
  }
  return { level: maxGrant, denied };
}

/**
 * ตรวจว่า user เข้าถึงเอกสารได้ในระดับที่ต้องการหรือไม่
 * คืน { allowed, level } — level เป็นชื่อ AccessLevel สูงสุดที่ได้
 */
export async function resolveDocumentAccess(
  user: CurrentUser,
  documentId: string,
): Promise<{ allowed: boolean; level: DocAccess | null; isOwner: boolean }> {
  const doc = await db.document.findFirst({
    where: { id: documentId, organizationId: user.organizationId },
    select: {
      id: true,
      ownerId: true,
      departmentId: true,
      confidentialityLevel: true,
      folderId: true,
      permissions: {
        select: {
          subjectType: true,
          subjectId: true,
          accessLevel: true,
          isDeny: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!doc) return { allowed: false, level: null, isOwner: false };

  const isOwner = doc.ownerId === user.id;

  // Admin / owner ได้สิทธิ์ MANAGE เสมอ
  if (isAdmin(user) || isOwner) {
    return { allowed: true, level: "MANAGE", isOwner };
  }

  const matchers = await subjectMatchers(user);

  // รวม folder ACL (สืบทอด) — ไล่จาก folder ปัจจุบันขึ้นไปถึง root
  const folderAcls: AclRow[] = [];
  let folderId = doc.folderId;
  const visited = new Set<string>();
  while (folderId && !visited.has(folderId)) {
    visited.add(folderId);
    const folder = await db.folder.findUnique({
      where: { id: folderId },
      select: {
        parentId: true,
        permissions: {
          select: {
            subjectType: true,
            subjectId: true,
            accessLevel: true,
            isDeny: true,
            expiresAt: true,
          },
        },
      },
    });
    if (!folder) break;
    folderAcls.push(...folder.permissions);
    folderId = folder.parentId;
  }

  const docResult = effectiveLevelFromAcls(doc.permissions, matchers);
  const folderResult = effectiveLevelFromAcls(folderAcls, matchers);

  // explicit deny ที่ document level มีผลเหนือกว่า
  if (docResult.denied) return { allowed: false, level: null, isOwner };

  let level = Math.max(docResult.level, folderResult.level);

  // department access: สมาชิกแผนกเดียวกันเห็นได้ (ยกเว้น RESTRICTED)
  if (
    level === 0 &&
    doc.departmentId &&
    doc.departmentId === user.departmentId &&
    doc.confidentialityLevel !== "RESTRICTED"
  ) {
    level = ACCESS_RANK.VIEW;
  }

  // เอกสาร PUBLIC/INTERNAL ในองค์กรเดียวกัน เห็นได้ระดับ VIEW
  if (
    level === 0 &&
    (doc.confidentialityLevel === "PUBLIC" || doc.confidentialityLevel === "INTERNAL")
  ) {
    level = ACCESS_RANK.VIEW;
  }

  if (level === 0) return { allowed: false, level: null, isOwner };

  const levelName = (Object.keys(ACCESS_RANK) as DocAccess[]).find(
    (k) => ACCESS_RANK[k] === level,
  ) ?? "VIEW";

  return { allowed: true, level: levelName, isOwner };
}

/** ต้องมีสิทธิ์เอกสารอย่างน้อยระดับที่กำหนด */
export async function canAccessDocument(
  user: CurrentUser,
  documentId: string,
  required: DocAccess,
): Promise<boolean> {
  const { allowed, level } = await resolveDocumentAccess(user, documentId);
  if (!allowed || !level) return false;
  return (ACCESS_RANK[level] ?? 0) >= (ACCESS_RANK[required] ?? 99);
}

/**
 * เงื่อนไข Prisma สำหรับกรองเฉพาะเอกสารที่ user มีสิทธิ์เห็น (สำหรับ list/search)
 * ใช้ในทุก query ที่แสดงรายการเอกสาร เพื่อ permission filter ฝั่ง server
 */
export async function visibleDocumentsWhere(
  user: CurrentUser,
): Promise<Prisma.DocumentWhereInput> {
  if (isAdmin(user)) {
    return { organizationId: user.organizationId };
  }
  const matchers = await subjectMatchers(user);
  const subjectOr = Array.from(matchers).map((m) => {
    const [subjectType, subjectId] = m.split(/:(.+)/);
    return { subjectType: subjectType as never, subjectId };
  });

  const or: Prisma.DocumentWhereInput[] = [
    { ownerId: user.id },
    // PUBLIC / INTERNAL
    { confidentialityLevel: { in: ["PUBLIC", "INTERNAL"] } },
    // มี document ACL ตรงกับ subject
    { permissions: { some: { isDeny: false, OR: subjectOr } } },
    // มี folder ACL ตรงกับ subject
    { folder: { permissions: { some: { isDeny: false, OR: subjectOr } } } },
  ];
  // เอกสารในแผนกเดียวกัน ยกเว้น RESTRICTED
  if (user.departmentId) {
    or.push({ departmentId: user.departmentId, confidentialityLevel: { not: "RESTRICTED" } });
  }

  return { organizationId: user.organizationId, OR: or } satisfies Prisma.DocumentWhereInput;
}
