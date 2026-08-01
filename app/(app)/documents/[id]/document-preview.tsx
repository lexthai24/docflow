"use client";

import * as React from "react";
import { Download, Maximize2, RotateCw, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileIcon } from "@/components/documents/file-icon";
import { formatBytes } from "@/lib/utils";

// Preview: PDF / รูปภาพ / text — ผ่าน protected route ?inline=1 (ตรวจ permission แล้ว)
// ไฟล์อื่น (DOCX/XLSX/PPTX) แสดง info + download (โครงสร้างพร้อมต่อยอด conversion service)

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const TEXT_TYPES = ["text/plain", "text/csv"];

export function DocumentPreview({
  documentId,
  versionId,
  mimeType,
  extension,
  filename,
  fileSize,
  canDownload,
}: {
  documentId: string;
  versionId: string;
  mimeType: string;
  extension: string;
  filename: string;
  fileSize: number;
  canDownload: boolean;
}) {
  const [rotation, setRotation] = React.useState(0);
  const [textContent, setTextContent] = React.useState<string | null>(null);
  const [loadingText, setLoadingText] = React.useState(false);
  const src = `/api/documents/${documentId}/download?inline=1&version=${versionId}`;

  React.useEffect(() => {
    if (!TEXT_TYPES.includes(mimeType)) return;
    let cancelled = false;
    // await ก่อน setState เพื่อเลี่ยง setState-in-effect แบบ sync (React 19 lint)
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoadingText(true);
      try {
        const r = await fetch(src);
        if (!r.ok) throw new Error();
        const t = await r.text();
        if (!cancelled) setTextContent(t.slice(0, 100_000));
      } catch {
        if (!cancelled) setTextContent(null);
      } finally {
        if (!cancelled) setLoadingText(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, mimeType]);

  const isPdf = mimeType === "application/pdf";
  const isImage = IMAGE_TYPES.includes(mimeType);
  const isText = TEXT_TYPES.includes(mimeType);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface-muted/50 px-3 py-2">
        <span className="truncate text-sm font-medium text-foreground">{filename}</span>
        <div className="flex items-center gap-1">
          {isImage && (
            <Button variant="ghost" size="icon-sm" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="หมุน">
              <RotateCw />
            </Button>
          )}
          {(isPdf || isImage) && (
            <a href={src} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon-sm" aria-label="เต็มจอ">
                <Maximize2 />
              </Button>
            </a>
          )}
          {canDownload && (
            <a href={`/api/documents/${documentId}/download?version=${versionId}`}>
              <Button variant="ghost" size="icon-sm" aria-label="ดาวน์โหลด">
                <Download />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Preview body */}
      <div className="flex min-h-[420px] items-center justify-center bg-surface-muted/30 p-4">
        {isPdf && (
          <iframe src={src} title={filename} className="h-[600px] w-full rounded border border-border bg-white" />
        )}
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={filename}
            className="max-h-[600px] max-w-full rounded object-contain transition-transform"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        )}
        {isText && (
          <div className="w-full">
            {loadingText ? (
              <p className="text-center text-sm text-muted-foreground">กำลังโหลด...</p>
            ) : textContent !== null ? (
              <pre className="max-h-[560px] overflow-auto rounded bg-surface p-4 text-xs leading-relaxed text-foreground scrollbar-thin font-mono whitespace-pre-wrap">
                {textContent}
              </pre>
            ) : (
              <p className="text-center text-sm text-muted-foreground">ไม่สามารถแสดงตัวอย่างได้</p>
            )}
          </div>
        )}
        {!isPdf && !isImage && !isText && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <FileIcon ext={extension} className="size-16" />
            <div>
              <p className="font-medium text-foreground">{filename}</p>
              <p className="text-sm text-muted-foreground">
                {extension.toUpperCase()} · {formatBytes(fileSize)}
              </p>
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              <FileQuestion className="mx-auto mb-2 size-5" />
              ไฟล์ประเภทนี้ยังไม่รองรับการแสดงตัวอย่างในเบราว์เซอร์ กรุณาดาวน์โหลดเพื่อเปิดดู
            </p>
            {canDownload && (
              <a href={`/api/documents/${documentId}/download?version=${versionId}`}>
                <Button>
                  <Download /> ดาวน์โหลดไฟล์
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
