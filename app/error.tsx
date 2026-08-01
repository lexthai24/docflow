"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">เกิดข้อผิดพลาด</h1>
        <p className="text-muted-foreground">ขออภัย เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง</p>
      </div>
      <Button onClick={reset}>ลองอีกครั้ง</Button>
    </div>
  );
}
