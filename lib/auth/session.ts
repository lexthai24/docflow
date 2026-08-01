import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// ── Stateless JWT (optimistic) + Database session (secure) ──
// สเปคหมวด 27: HTTP-only, Secure, SameSite; session expiration; ตรวจฝั่ง server

const COOKIE_NAME = "docflow_session";
const encodedKey = new TextEncoder().encode(env.AUTH_SECRET);

export interface SessionPayload {
  userId: string;
  organizationId: string;
  sessionId: string;
  [key: string]: unknown;
}

async function encrypt(payload: SessionPayload, expiresAt: Date): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedKey);
}

export async function decryptSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * สร้าง session ใหม่: บันทึกลง DB (secure) + set cookie ที่เก็บ JWT (optimistic)
 * เก็บเฉพาะ sha256 ของ raw token ใน DB เพื่อความปลอดภัย
 */
export async function createSession(
  userId: string,
  organizationId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null },
): Promise<void> {
  const expiresAt = new Date(Date.now() + env.SESSION_MAX_AGE * 1000);
  const rawToken = randomBytes(32).toString("hex");

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
    select: { id: true },
  });

  const jwt = await encrypt(
    { userId, organizationId, sessionId: session.id, t: rawToken },
    expiresAt,
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/** อ่าน JWT จาก cookie (optimistic — ยังไม่แตะ DB) */
export async function getSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decryptSession(token);
}

/**
 * ตรวจสอบ session กับ DB (secure): ยืนยันว่า session ยังไม่หมดอายุ/ถูกเพิกถอน
 * คืน userId + organizationId ถ้าถูกต้อง
 */
export async function validateSessionInDb(
  payload: SessionPayload,
): Promise<{ userId: string; organizationId: string; sessionId: string } | null> {
  const rawToken = payload.t as string | undefined;
  if (!payload.sessionId || !rawToken) return null;

  const session = await db.session.findUnique({
    where: { id: payload.sessionId },
    select: { id: true, userId: true, tokenHash: true, expiresAt: true },
  });

  if (!session) return null;
  if (session.tokenHash !== hashToken(rawToken)) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.userId !== payload.userId) return null;

  return {
    userId: payload.userId,
    organizationId: payload.organizationId,
    sessionId: session.id,
  };
}

/** ลบ session (logout): ลบจาก DB + ลบ cookie */
export async function destroySession(): Promise<void> {
  const payload = await getSessionCookie();
  if (payload?.sessionId) {
    await db.session.deleteMany({ where: { id: payload.sessionId } });
  }
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
