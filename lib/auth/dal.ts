import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionCookie, validateSessionInDb } from "@/lib/auth/session";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import type { PermissionKey } from "@/lib/permissions";

export interface CurrentUser {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  status: string;
  departmentId: string | null;
  departmentName: string | null;
  roleKeys: string[];
  permissions: Set<PermissionKey>;
}

/**
 * ตรวจสอบ session แบบ secure (แตะ DB) — memoized ต่อ 1 request ด้วย React cache
 * คืน null ถ้าไม่ได้ล็อกอิน (ไม่ redirect — ให้ผู้เรียกตัดสินใจ)
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const payload = await getSessionCookie();
  if (!payload) return null;

  const valid = await validateSessionInDb(payload);
  if (!valid) return null;

  const user = await db.user.findFirst({
    where: { id: valid.userId, organizationId: valid.organizationId, status: "ACTIVE" },
    select: {
      id: true,
      organizationId: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      jobTitle: true,
      status: true,
      departmentId: true,
      department: { select: { name: true } },
      userRoles: {
        select: {
          role: {
            select: {
              key: true,
              rolePermissions: { select: { permission: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const permissions = new Set<PermissionKey>();
  const roleKeys: string[] = [];
  for (const ur of user.userRoles) {
    roleKeys.push(ur.role.key);
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.key as PermissionKey);
    }
  }

  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    status: user.status,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? null,
    roleKeys,
    permissions,
  };
});

/** ต้องล็อกอิน — redirect ไป /login ถ้าไม่ (ใช้ในหน้า/layout ที่ป้องกัน) */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** ต้องล็อกอิน — โยน error (ใช้ใน server action / route handler) */
export async function assertAuthenticated(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

export function hasPermission(user: CurrentUser, permission: PermissionKey): boolean {
  return user.permissions.has(permission);
}

export function hasAnyPermission(user: CurrentUser, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => user.permissions.has(p));
}

export function hasRole(user: CurrentUser, roleKey: string): boolean {
  return user.roleKeys.includes(roleKey);
}

export function isAdmin(user: CurrentUser): boolean {
  return hasRole(user, "SUPER_ADMIN") || hasRole(user, "ADMIN");
}

/** ต้องมี permission — โยน AuthorizationError ถ้าไม่มี (ใช้ใน action/route) */
export async function requirePermission(permission: PermissionKey): Promise<CurrentUser> {
  const user = await assertAuthenticated();
  if (!hasPermission(user, permission)) {
    throw new AuthorizationError();
  }
  return user;
}
