"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Trash2, Trash } from "lucide-react";
import { FileIcon } from "@/components/documents/file-icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import type { DocumentListItem } from "@/lib/services/documents";
import { restoreDocumentAction, permanentDeleteAction } from "./actions";

export function TrashList({
  items,
  canPermanentDelete,
}: {
  items: DocumentListItem[];
  canPermanentDelete: boolean;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = React.useState<DocumentListItem | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onRestore(id: string) {
    const res = await restoreDocumentAction(id);
    if (res.ok) {
      toast.success("กู้คืนเอกสารแล้ว");
      router.refresh();
    } else toast.error(res.error);
  }

  async function onDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const res = await permanentDeleteAction(deleteTarget.id);
    setLoading(false);
    if (res.ok) {
      toast.success("ลบเอกสารถาวรแล้ว");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(res.error);
      setDeleteTarget(null);
    }
  }

  if (items.length === 0) {
    return <EmptyState icon={<Trash />} title="ถังขยะว่างเปล่า" description="เอกสารที่ลบจะแสดงที่นี่และสามารถกู้คืนได้" />;
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <ul className="divide-y divide-border">
          {items.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
              <FileIcon ext={doc.fileExtension} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{doc.documentNumber} · {doc.ownerName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onRestore(doc.id)}>
                <RotateCcw /> กู้คืน
              </Button>
              {canPermanentDelete && (
                <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(doc)} aria-label="ลบถาวร" className="text-danger">
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        loading={loading}
        title="ลบถาวร?"
        description={`ต้องการลบ "${deleteTarget?.title}" อย่างถาวรหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้ และไฟล์จะถูกลบจากระบบจัดเก็บ`}
        confirmLabel="ลบถาวร"
      />
    </>
  );
}
