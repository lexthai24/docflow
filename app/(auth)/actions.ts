"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/dal";
import { LoginSchema } from "@/lib/validations/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { audit, AUDIT, getRequestMeta } from "@/lib/audit";

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
