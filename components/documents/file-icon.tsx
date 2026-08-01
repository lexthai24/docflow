import { FileText, FileSpreadsheet, FileImage, File, FileType, FileArchive } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, { icon: typeof File; color: string }> = {
  pdf: { icon: FileText, color: "#dc2626" },
  doc: { icon: FileType, color: "#2563eb" },
  docx: { icon: FileType, color: "#2563eb" },
  xls: { icon: FileSpreadsheet, color: "#059669" },
  xlsx: { icon: FileSpreadsheet, color: "#059669" },
  csv: { icon: FileSpreadsheet, color: "#059669" },
  ppt: { icon: FileText, color: "#d97706" },
  pptx: { icon: FileText, color: "#d97706" },
  jpg: { icon: FileImage, color: "#7c3aed" },
  jpeg: { icon: FileImage, color: "#7c3aed" },
  png: { icon: FileImage, color: "#7c3aed" },
  webp: { icon: FileImage, color: "#7c3aed" },
  svg: { icon: FileImage, color: "#7c3aed" },
  zip: { icon: FileArchive, color: "#64748b" },
  txt: { icon: FileText, color: "#64748b" },
};

export function FileIcon({ ext, className }: { ext?: string | null; className?: string }) {
  const cfg = (ext && ICON_MAP[ext.toLowerCase()]) || { icon: File, color: "#64748b" };
  const Cmp = cfg.icon;
  return <Cmp className={cn("size-5 shrink-0", className)} style={{ color: cfg.color }} />;
}
