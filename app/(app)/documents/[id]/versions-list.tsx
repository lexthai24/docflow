"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/dialog";
import { restoreVersionAction } from "../actions";

export interface VersionItem {
  id: string;
  versionNumber: number;
  originalFilename: string;
  fileSize: number;
  changeNote: string | null;
  createdByName: string;
  createdAt: Date;
  isCurrent: boolean;
}

export function VersionsList({
  documentId,
  versions,
  canDownload,
  canRestore,
}: {
  documentId: string;
  versions: VersionItem[];
  canDownload: boolean;
  canRestore: boolean;
}) {
  const router = useRouter();
  const [restoreTarget, setRestoreTarget] = React.useState<VersionItem | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onRestore() {
    if (!restoreTarget) return;
    setLoading(true);
    const res = await restoreVersionAction({ documentId, versionId: restoreTarget.id });
    setLoading(false);
    if (res.ok) {
      toast.success(`กู้คืนเวอร์ชัน ${restoreTarget.versionNumber} เป็นเวอร์ชันใหม่แล้ว`);
      setRestoreTarget(null);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {versions.map((v) => (
          <li
            key={v.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              v.isCurrent ? "border-primary/40 bg-accent/50" : "border-border bg-surface",
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-foreground">
              v{v.versionNumber}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{v.originalFilename}</span>
                {v.isCurrent && <Badge className="border-primary/30 bg-primary/10 text-primary">ปัจจุบัน</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {v.createdByName} · {format(new Date(v.createdAt), "d MMM yyyy HH:mm", { locale: th })} · {formatBytes(v.fileSize)}
              </p>
              {v.changeNote && <p className="mt-1 text-xs text-foreground/80">📝 {v.changeNote}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canDownload && (
                <a href={`/api/documents/${documentId}/download?version=${v.id}`}>
                  <Button variant="ghost" size="icon-sm" aria-label="ดาวน์โหลดเวอร์ชันนี้">
                    <Download />
                  </Button>
                </a>
              )}
              {canRestore && !v.isCurrent && (
                <Button variant="ghost" size="icon-sm" onClick={() => setRestoreTarget(v)} aria-label="กู้คืนเวอร์ชันนี้">
                  <RotateCcw />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={onRestore}
        loading={loading}
        variant="primary"
        title={`กู้คืนเวอร์ชัน ${restoreTarget?.versionNumber}?`}
        description="ระบบจะสร้างเวอร์ชันใหม่จากเวอร์ชันนี้ โดยไม่ลบเวอร์ชันเดิม"
        confirmLabel="กู้คืน"
      />
    </div>
  );
}
