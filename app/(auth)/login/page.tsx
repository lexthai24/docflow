import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { DemoLogin } from "./demo-login";
import { getDemoUsers } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

// อ่าน demo users จาก DB ตอน runtime (DEMO_MODE ต้องมีผลตอนรัน ไม่ใช่ตอน build)
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // ดึง demo users (คืน [] ถ้า DEMO_MODE ปิด)
  const demoUsers = await getDemoUsers();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
        <p className="text-sm text-muted-foreground">
          กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบจัดการเอกสาร
        </p>
      </div>
      <LoginForm />
      <DemoLogin users={demoUsers} />
    </div>
  );
}
