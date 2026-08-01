"use client";

import * as React from "react";
import { Sidebar, type SidebarBadges } from "@/components/shell/sidebar";
import { Topbar, type TopbarUser } from "@/components/shell/topbar";
import type { NavGroup } from "@/lib/navigation";

export function AppShell({
  navGroups,
  badges,
  user,
  unreadCount,
  children,
}: {
  navGroups: NavGroup[];
  badges: SidebarBadges;
  user: TopbarUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        groups={navGroups}
        badges={badges}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} unreadCount={unreadCount} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
