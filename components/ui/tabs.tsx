"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  active: string;
  setActive: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [active, setActive] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-1 border-b border-border", className)} role="tablist">
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  const active = ctx.active === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setActive(value)}
      className={cn(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.active !== value) return null;
  return <div className="pt-4 animate-in">{children}</div>;
}
