"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { demoLoginAction, type DemoUser } from "@/app/(auth)/actions";

// ปุ่ม quick-login สำหรับ demo — คลิกเลือก user ตาม role แล้ว login ทันที
// แสดงเฉพาะเมื่อ DEMO_MODE=true (server ส่ง demoUsers มาว่างถ้าปิด)

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "#7c3aed",
  ADMIN: "#2563eb",
  RECORDS_MANAGER: "#0891b2",
  DEPARTMENT_MANAGER: "#059669",
  APPROVER: "#d97706",
  REVIEWER: "#dc2626",
  EDITOR: "#db2777",
  VIEWER: "#64748b",
};

export function DemoLogin({ users }: { users: DemoUser[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  if (users.length === 0) return null;

  async function login(user: DemoUser) {
    setPendingId(user.id);
    const res = await demoLoginAction(user.id);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error(res.error);
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">หรือเข้าสู่ระบบแบบ Demo</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        คลิกเลือกผู้ใช้เพื่อทดลองระบบตามบทบาทต่างๆ (ไม่ต้องใส่รหัสผ่าน)
      </p>

      <div className="grid gap-2">
        {users.map((user) => {
          const color = ROLE_COLOR[user.roleKey] ?? "#64748b";
          const isPending = pendingId === user.id;
          return (
            <button
              key={user.id}
              onClick={() => login(user)}
              disabled={Boolean(pendingId)}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors",
                "hover:border-primary/50 hover:bg-surface-muted disabled:opacity-60 disabled:pointer-events-none",
              )}
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {getInitials(user.fullName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{user.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {user.roleName}
                  {user.jobTitle ? ` · ${user.jobTitle}` : ""}
                </span>
              </span>
              {isPending ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              ) : (
                <span
                  className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  {user.roleKey}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
