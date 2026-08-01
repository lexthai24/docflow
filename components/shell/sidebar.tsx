"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { BrandLogo } from "@/components/brand-logo";
import type { NavGroup } from "@/lib/navigation";

export interface SidebarBadges {
  pendingReview?: number;
  pendingApproval?: number;
  expiring?: number;
}

export function Sidebar({
  groups,
  badges,
  mobileOpen,
  onMobileClose,
}: {
  groups: NavGroup[];
  badges: SidebarBadges;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  // อ่านสถานะ collapse จาก localStorage ผ่าน external store (เลี่ยง setState-in-effect)
  const collapsed = React.useSyncExternalStore(
    (cb) => {
      window.addEventListener("docflow-sidebar-change", cb);
      return () => window.removeEventListener("docflow-sidebar-change", cb);
    },
    () => localStorage.getItem("docflow-sidebar-collapsed") === "true",
    () => false,
  );

  const toggleCollapse = () => {
    localStorage.setItem("docflow-sidebar-collapsed", String(!collapsed));
    window.dispatchEvent(new Event("docflow-sidebar-change"));
  };

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
          "lg:static lg:translate-x-0",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
          <BrandLogo size={36} />
          {!collapsed && (
            <span className="truncate text-base font-semibold text-white">DocFlow</span>
          )}
          <button
            onClick={toggleCollapse}
            className="ml-auto hidden size-7 items-center justify-center rounded text-sidebar-foreground hover:bg-sidebar-active lg:flex"
            aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const badgeCount =
                    item.badge && badges[item.badge] ? badges[item.badge] : undefined;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-active text-sidebar-active-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-active/60 hover:text-white",
                        collapsed && "justify-center",
                      )}
                    >
                      <Icon name={item.icon} className="size-4 shrink-0" />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && badgeCount ? (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {badgeCount}
                        </span>
                      ) : null}
                      {collapsed && badgeCount ? (
                        <span className="absolute ml-6 -mt-4 size-2 rounded-full bg-primary" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
