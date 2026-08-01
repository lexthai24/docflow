import { NextResponse, type NextRequest } from "next/server";
import { decryptSession, COOKIE_NAME } from "@/lib/auth/session";

// Next.js 16: middleware ถูกแทนที่ด้วย proxy.ts
// ตรวจสอบแบบ optimistic (อ่านจาก cookie เท่านั้น ไม่แตะ DB) เพื่อ performance
// การตรวจสอบ secure จริงเกิดใน DAL ที่ระดับ page/action/route

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/accept-invitation", "/share"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await decryptSession(token);
  const isAuthed = Boolean(session?.userId);

  // ล็อกอินอยู่แล้วแต่เข้าหน้า login → ส่งไป dashboard
  if (isAuthed && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // ยังไม่ล็อกอินและเข้าหน้าที่ต้องป้องกัน → ส่งไป login (พร้อม ?next=)
  if (!isAuthed && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // ไม่รันบน static assets, api ที่จัดการ auth เอง, และไฟล์
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
