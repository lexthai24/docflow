import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ฝั่งซ้าย: branding (ซ่อนบน mobile) */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={40} />
          <span className="text-lg font-semibold text-white">DocFlow Enterprise</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-snug text-white">
            ระบบจัดการเอกสาร
            <br />
            ระดับองค์กร
          </h1>
          <p className="max-w-md text-sidebar-foreground">
            จัดเก็บ ค้นหา จัดหมวดหมู่ แชร์ ตรวจสอบ อนุมัติ และติดตามเอกสารภายในองค์กร
            อย่างปลอดภัยและเป็นระบบ
          </p>
        </div>
        <p className="text-sm text-sidebar-foreground/60">
          © 2026 DocFlow Enterprise · ปลอดภัยด้วยการควบคุมสิทธิ์หลายระดับ
        </p>
      </div>

      {/* ฝั่งขวา: form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandLogo size={40} />
            <span className="text-lg font-semibold">DocFlow Enterprise</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
