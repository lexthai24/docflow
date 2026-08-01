import Image from "next/image";
import { cn } from "@/lib/utils";

// โลโก้แบรนด์ — ใช้ app icon (โปร่งแสง) ผ่าน next/image (optimize อัตโนมัติ)
// เปลี่ยนโลโก้ได้จากไฟล์ public/brand-icon.png ที่เดียว
export function BrandLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand-icon.png"
      alt="DocFlow Enterprise"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
