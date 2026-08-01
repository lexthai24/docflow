"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/dal";
import { LoginSchema } from "@/lib/validations/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { audit, AUDIT, getRequestMeta } from "@/lib/audit";
import { env } from "@/lib/env";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

export interface LoginState {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
}

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const meta = await getRequestMeta();

  // Rate limit: 5 ครั้ง / 15 นาที ต่อ (email + ip)
  const rlKey = `login:${email}:${meta.ipAddress ?? "unknown"}`;
  const rl = rateLimit(rlKey, 5, 15 * 60);
  if (!rl.ok) {
    return {
      error: `พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารออีก ${Math.ceil(rl.retryAfterSeconds / 60)} นาที`,
    };
  }

  const user = await db.user.findFirst({
    where: { email },
    select: {
      id: true,
      organizationId: true,
      passwordHash: true,
      status: true,
    },
  });

  // ข้อความ error เหมือนกันไม่ว่าจะ email ผิดหรือ password ผิด (กัน user enumeration)
  const invalidMsg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";

  if (!user) {
    return { error: invalidMsg };
  }

  const passwordOk = await verifyPassword(user.passwordHash, password);
  if (!passwordOk) {
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.LOGIN_FAILED,
      entityType: "User",
      entityId: user.id,
      metadata: { email },
    });
    return { error: invalidMsg };
  }

  if (user.status !== "ACTIVE") {
    return {
      error:
        user.status === "SUSPENDED"
          ? "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
          : "บัญชีนี้ยังไม่ได้เปิดใช้งาน",
    };
  }

  await createSession(user.id, user.organizationId, meta);
  resetRateLimit(rlKey);

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({
    organizationId: user.organizationId,
    actorId: user.id,
    action: AUDIT.LOGIN,
    entityType: "User",
    entityId: user.id,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await audit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: AUDIT.LOGOUT,
      entityType: "User",
      entityId: user.id,
    });
  }
  await destroySession();
  redirect("/login");
}

// ── Demo quick-login (สำหรับ demo เท่านั้น) ──
// login ด้วย userId โดยไม่ต้องใส่รหัสผ่าน — เปิดเฉพาะเมื่อ DEMO_MODE=true
// ป้องกันหลายชั้น: ตรวจ env, จำกัดเฉพาะ user demo (@docflow.local), rate limit

export interface DemoUser {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string | null;
  roleName: string;
  roleKey: string;
}

export async function demoLoginAction(userId: string): Promise<ActionResult> {
  // 1. ต้องเปิด DEMO_MODE เท่านั้น (ตรวจฝั่ง server — client ปลอมไม่ได้)
  if (!env.DEMO_MODE) {
    return actionError("Demo mode ไม่ได้เปิดใช้งาน");
  }

  const meta = await getRequestMeta();
  // 2. rate limit กันสแปม
  const rl = rateLimit(`demo-login:${meta.ipAddress ?? "unknown"}`, 30, 60);
  if (!rl.ok) {
    return actionError("เข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่");
  }

  // 3. อนุญาตเฉพาะ user demo ที่ seed ไว้ (email @docflow.local, สถานะ ACTIVE)
  const user = await db.user.findFirst({
    where: {
      id: userId,
      status: "ACTIVE",
      email: { endsWith: "@docflow.local" },
    },
    select: { id: true, organizationId: true },
  });
  if (!user) {
    return actionError("ไม่พบบัญชี demo นี้");
  }

  await createSession(user.id, user.organizationId, meta);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({
    organizationId: user.organizationId,
    actorId: user.id,
    action: AUDIT.LOGIN,
    entityType: "User",
    entityId: user.id,
    metadata: { demo: true },
  });

  return actionOk(undefined);
}

/** ดึงรายชื่อ demo users สำหรับแสดงปุ่ม quick-login (เปิดเฉพาะ DEMO_MODE) */
export async function getDemoUsers(): Promise<DemoUser[]> {
  if (!env.DEMO_MODE) return [];
  const users = await db.user.findMany({
    where: { status: "ACTIVE", email: { endsWith: "@docflow.local" } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      userRoles: { select: { role: { select: { name: true, key: true } } }, take: 1 },
    },
  });
  return users.map((u) => ({
    id: u.id,
    fullName: `${u.firstName} ${u.lastName}`,
    email: u.email,
    jobTitle: u.jobTitle,
    roleName: u.userRoles[0]?.role.name ?? "ผู้ใช้งาน",
    roleKey: u.userRoles[0]?.role.key ?? "VIEWER",
  }));
}
