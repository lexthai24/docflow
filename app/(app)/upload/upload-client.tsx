"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, X, CheckCircle2, AlertCircle, Loader2, FileUp } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { FileIcon } from "@/components/documents/file-icon";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  documentId?: string;
}

const ALLOWED = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "jpg", "jpeg", "png", "webp", "svg", "zip"];

export function UploadClient({
  folders,
  categories,
  maxSize,
}: {
  folders: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  maxSize: number;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [folderId, setFolderId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [confidentiality, setConfidentiality] = React.useState("INTERNAL");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const valid: UploadItem[] = [];
    for (const file of arr) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED.includes(ext)) {
        toast.error(`ไม่รองรับไฟล์ .${ext} (${file.name})`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} มีขนาดเกิน ${formatBytes(maxSize)}`);
        continue;
      }
      valid.push({ id: crypto.randomUUID(), file, progress: 0, status: "pending" });
    }
    setItems((prev) => [...prev, ...valid]);
  }

  function uploadOne(item: UploadItem): Promise<void> {
    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("title", item.file.name.replace(/\.[^.]+$/, ""));
      if (folderId) fd.append("folderId", folderId);
      if (categoryId) fd.append("categoryId", categoryId);
      fd.append("confidentiality", confidentiality);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/documents/upload");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: pct, status: "uploading" } : x)));
        }
      };
      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && res.ok) {
            setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress: 100, status: "done", documentId: res.data.id } : x)));
            if (res.data.duplicateOf) {
              toast.warning(`"${item.file.name}" มีเนื้อหาเหมือนกับ ${res.data.duplicateOf.documentNumber}`);
            }
          } else {
            setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: "error", error: res.error ?? "อัปโหลดล้มเหลว" } : x)));
          }
        } catch {
          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: "error", error: "เกิดข้อผิดพลาด" } : x)));
        }
        resolve();
      };
      xhr.onerror = () => {
        setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: "error", error: "การเชื่อมต่อล้มเหลว" } : x)));
        resolve();
      };
      xhr.send(fd);
    });
  }

  async function uploadAll() {
    const pending = items.filter((i) => i.status === "pending" || i.status === "error");
    for (const item of pending) {
      // reset error state before retry
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: "uploading", error: undefined, progress: 0 } : x)));
      await uploadOne(item);
    }
    const done = items.filter((i) => i.status === "done").length + pending.length;
    if (done > 0) {
      toast.success("อัปโหลดเสร็จสิ้น");
      router.refresh();
    }
  }

  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "error").length;
  const allDone = items.length > 0 && items.every((i) => i.status === "done");

  return (
    <div className="space-y-6">
      {/* Metadata options */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>โฟลเดอร์ปลายทาง</Label>
          <Select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">— ไม่ระบุ —</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>หมวดหมู่</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— ไม่ระบุ —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ระดับความลับ</Label>
          <Select value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)}>
            <option value="PUBLIC">สาธารณะ</option>
            <option value="INTERNAL">ภายในองค์กร</option>
            <option value="CONFIDENTIAL">ลับ</option>
            <option value="RESTRICTED">ลับที่สุด</option>
          </Select>
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-surface-muted/50",
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <UploadCloud className="size-7" />
        </div>
        <div>
          <p className="font-medium text-foreground">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
          <p className="mt-1 text-sm text-muted-foreground">
            รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ · สูงสุด {formatBytes(maxSize)} ต่อไฟล์
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED.map((e) => `.${e}`).join(",")}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
              <FileIcon ext={item.file.name.split(".").pop()} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{item.file.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                </div>
                {item.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === "error" && <p className="mt-1 text-xs text-danger">{item.error}</p>}
              </div>
              <div className="flex shrink-0 items-center">
                {item.status === "done" && <CheckCircle2 className="size-5 text-success" />}
                {item.status === "error" && <AlertCircle className="size-5 text-danger" />}
                {item.status === "uploading" && <Loader2 className="size-5 animate-spin text-primary" />}
                {item.status === "pending" && (
                  <button onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))} aria-label="ลบ" className="text-muted-foreground hover:text-danger">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {items.length > 0 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setItems([])} className="text-sm text-muted-foreground hover:text-foreground">
            ล้างรายการ
          </button>
          {allDone ? (
            <Button onClick={() => router.push("/documents")}>
              <FileUp /> ดูเอกสารทั้งหมด
            </Button>
          ) : (
            <Button onClick={uploadAll} disabled={pendingCount === 0}>
              <UploadCloud /> อัปโหลด {pendingCount > 0 ? `(${pendingCount})` : ""}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
