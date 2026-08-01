import * as React from "react";
import { cn } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS, CONFIDENTIALITY_LABELS, PRIORITY_LABELS } from "@/lib/constants";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = DOCUMENT_STATUS_LABELS[status] ?? {
    label: status,
    color: "text-slate-600 bg-slate-100 border-slate-200",
    dot: "bg-slate-400",
  };
  return (
    <Badge className={cn(cfg.color, className)}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

export function ConfidentialityBadge({ level, className }: { level: string; className?: string }) {
  const cfg = CONFIDENTIALITY_LABELS[level] ?? { label: level, color: "text-slate-600 bg-slate-100" };
  return <Badge className={cn("border-transparent", cfg.color, className)}>{cfg.label}</Badge>;
}

export function PriorityLabel({ priority, className }: { priority: string; className?: string }) {
  const cfg = PRIORITY_LABELS[priority] ?? { label: priority, color: "text-slate-500" };
  return <span className={cn("text-xs font-medium", cfg.color, className)}>{cfg.label}</span>;
}
