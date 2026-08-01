"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

// เก็บ theme ใน localStorage + subscribe การเปลี่ยนแปลง (เลี่ยง setState-in-effect)
function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => e.key === "docflow-theme" && callback();
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onStorage);
  mq.addEventListener("change", callback);
  window.addEventListener("docflow-theme-change", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    mq.removeEventListener("change", callback);
    window.removeEventListener("docflow-theme-change", callback);
  };
}

export function useTheme() {
  const theme = React.useSyncExternalStore(
    subscribe,
    () => (localStorage.getItem("docflow-theme") as Theme) || "system",
    () => "system" as Theme,
  );

  const setTheme = React.useCallback((t: Theme) => {
    localStorage.setItem("docflow-theme", t);
    applyTheme(t);
    window.dispatchEvent(new Event("docflow-theme-change"));
  }, []);

  // sync class เมื่อ system preference เปลี่ยนขณะอยู่โหมด system
  React.useEffect(() => {
    if (theme === "system") applyTheme("system");
  }, [theme]);

  return { theme, setTheme };
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="size-4" />, label: "สว่าง" },
    { value: "dark", icon: <Moon className="size-4" />, label: "มืด" },
    { value: "system", icon: <Monitor className="size-4" />, label: "ระบบ" },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          aria-label={`ธีม${o.label}`}
          title={o.label}
          className={cn(
            "flex size-7 items-center justify-center rounded transition-colors",
            theme === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-surface-muted",
          )}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
