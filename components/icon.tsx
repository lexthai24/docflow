import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";

// เรนเดอร์ lucide icon จากชื่อ (ใช้กับ nav config, category icon ฯลฯ)
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  if (!Cmp) return <Icons.File {...props} />;
  return <Cmp {...props} />;
}
