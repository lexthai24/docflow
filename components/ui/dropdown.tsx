"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function Dropdown({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext)!;
  return (
    <div onClick={() => ctx.setOpen(!ctx.open)} className="cursor-pointer">
      {children}
    </div>
  );
}

export function DropdownContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const ctx = React.useContext(DropdownContext)!;
  if (!ctx.open) return null;
  return (
    <div
      role="menu"
      className={cn(
        "absolute z-40 mt-1 min-w-[12rem] overflow-hidden rounded-md border border-border bg-surface p-1 shadow-lg animate-in",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  className,
  destructive,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const ctx = React.useContext(DropdownContext)!;
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        ctx.setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors [&_svg]:size-4",
        "hover:bg-surface-muted disabled:opacity-50 disabled:pointer-events-none",
        destructive ? "text-danger hover:bg-danger/10" : "text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">{children}</div>;
}
