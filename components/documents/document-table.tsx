"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Star,
  Search,
  X,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { FileIcon } from "@/components/documents/file-icon";
import { StatusBadge, ConfidentialityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { Files } from "lucide-react";
import { Select } from "@/components/ui/input";
import type { DocumentListResult } from "@/lib/services/documents";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";

interface FilterOption {
  categories: { id: string; name: string; color: string }[];
  departments: { id: string; name: string }[];
}

export function DocumentTable({
  result,
  options,
}: {
  result: DocumentListResult;
  options: FilterOption;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");

  const updateParams = React.useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in updates)) params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  // debounce search
  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => updateParams({ q: q || null }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const currentSort = searchParams.get("sortBy") ?? "updatedAt";
  const currentDir = searchParams.get("sortDir") ?? "desc";
  const toggleSort = (field: string) => {
    const dir = currentSort === field && currentDir === "desc" ? "asc" : "desc";
    updateParams({ sortBy: field, sortDir: dir });
  };

  const hasFilters = ["status", "categoryId", "confidentiality", "departmentId"].some((k) =>
    searchParams.get(k),
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อ เลขที่ คำอธิบาย..."
            className="h-10 w-full rounded-md border border-input bg-surface pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParams({ status: e.target.value || null })}
          className="sm:w-44"
        >
          <option value="">ทุกสถานะ</option>
          {Object.entries(DOCUMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>

        <Select
          value={searchParams.get("categoryId") ?? ""}
          onChange={(e) => updateParams({ categoryId: e.target.value || null })}
          className="sm:w-44"
        >
          <option value="">ทุกหมวดหมู่</option>
          {options.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <Select
          value={searchParams.get("confidentiality") ?? ""}
          onChange={(e) => updateParams({ confidentiality: e.target.value || null })}
          className="sm:w-40"
        >
          <option value="">ทุกระดับความลับ</option>
          <option value="PUBLIC">สาธารณะ</option>
          <option value="INTERNAL">ภายในองค์กร</option>
          <option value="CONFIDENTIAL">ลับ</option>
          <option value="RESTRICTED">ลับที่สุด</option>
        </Select>

        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" /> ล้างตัวกรอง
          </button>
        )}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={<Files />}
          title="ไม่พบเอกสาร"
          description={hasFilters || q ? "ลองปรับตัวกรองหรือคำค้นหา" : "ยังไม่มีเอกสารในระบบ"}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-left text-xs text-muted-foreground">
                  <th className="w-8 px-3 py-3"></th>
                  <SortableHeader label="เอกสาร" field="title" current={currentSort} dir={currentDir} onClick={toggleSort} />
                  <th className="px-3 py-3 font-medium">สถานะ</th>
                  <th className="px-3 py-3 font-medium">หมวดหมู่</th>
                  <th className="px-3 py-3 font-medium">เจ้าของ</th>
                  <th className="px-3 py-3 font-medium">ความลับ</th>
                  <th className="px-3 py-3 font-medium text-right">ขนาด</th>
                  <SortableHeader label="แก้ไขล่าสุด" field="updatedAt" current={currentSort} dir={currentDir} onClick={toggleSort} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-3 py-3">
                      {doc.isFavorite && <Star className="size-4 fill-amber-400 text-amber-400" />}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/documents/${doc.id}`} className="flex items-center gap-2.5 group">
                        <FileIcon ext={doc.fileExtension} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground group-hover:text-primary max-w-xs">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.documentNumber}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-3 py-3">
                      {doc.categoryName ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="size-2 rounded-full" style={{ backgroundColor: doc.categoryColor ?? "#64748b" }} />
                          {doc.categoryName}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{doc.ownerName}</td>
                    <td className="px-3 py-3"><ConfidentialityBadge level={doc.confidentialityLevel} /></td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {doc.fileSize ? formatBytes(doc.fileSize) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(doc.updatedAt, { addSuffix: true, locale: th })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {result.items.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <FileIcon ext={doc.fileExtension} className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{doc.title}</p>
                    {doc.isFavorite && <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{doc.documentNumber} · {doc.ownerName}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={doc.status} />
                    <ConfidentialityBadge level={doc.confidentialityLevel} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <Pagination result={result} onPage={(p) => updateParams({ page: String(p) })} />
        </>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  field,
  current,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  field: string;
  current: string;
  dir: string;
  onClick: (f: string) => void;
  align?: "left" | "right";
}) {
  const active = current === field;
  return (
    <th className={cn("px-3 py-3 font-medium", align === "right" && "text-right")}>
      <button
        onClick={() => onClick(field)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
      >
        {label}
        <ArrowUpDown className={cn("size-3", active && (dir === "asc" ? "rotate-180" : ""))} />
      </button>
    </th>
  );
}

function Pagination({
  result,
  onPage,
}: {
  result: DocumentListResult;
  onPage: (page: number) => void;
}) {
  const { page, totalPages, total, pageSize } = result;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        แสดง {from}–{to} จาก {total.toLocaleString()} รายการ
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex size-9 items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-surface-muted"
          aria-label="ก่อนหน้า"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-3 text-sm text-foreground">{page} / {totalPages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="flex size-9 items-center justify-center rounded-md border border-border disabled:opacity-40 hover:bg-surface-muted"
          aria-label="ถัดไป"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
