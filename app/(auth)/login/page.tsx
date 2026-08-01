import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
        <p className="text-sm text-muted-foreground">
          กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบจัดการเอกสาร
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
