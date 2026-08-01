import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <FileQuestion className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground">ไม่พบหน้าที่คุณต้องการ</p>
      </div>
      <Link href="/dashboard">
        <Button>กลับสู่หน้าหลัก</Button>
      </Link>
    </div>
  );
}
