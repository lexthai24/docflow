import * as React from "react";
import { cn, getInitials } from "@/lib/utils";

// ── Avatar ──
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "size-6 text-[10px]",
    sm: "size-8 text-xs",
    md: "size-9 text-sm",
    lg: "size-12 text-base",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground overflow-hidden",
        sizes[size],
        className,
      )}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

// ── Skeleton ──
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-muted",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-black/[0.04] before:to-transparent dark:before:via-white/[0.04]",
        className,
      )}
    />
  );
}

// ── Empty state ──
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted-foreground [&_svg]:size-10 opacity-60">{icon}</div>}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── Separator ──
export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}
