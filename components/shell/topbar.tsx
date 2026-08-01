"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, LogOut, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
} from "@/components/ui/dropdown";
import { logoutAction } from "@/app/(auth)/actions";

export interface TopbarUser {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  roleLabel: string;
}

export function Topbar({
  user,
  unreadCount,
  onMenuClick,
}: {
  user: TopbarUser;
  unreadCount: number;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md">
      <button
        onClick={onMenuClick}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted lg:hidden"
        aria-label="เปิดเมนู"
      >
        <Menu className="size-5" />
      </button>

      {/* Global search */}
      <form onSubmit={onSearch} className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาเอกสาร เลขที่ แท็ก..."
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted"
          aria-label={`การแจ้งเตือน${unreadCount > 0 ? ` (${unreadCount} รายการใหม่)` : ""}`}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <Dropdown>
          <DropdownTrigger>
            <button className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-surface-muted">
              <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
              <span className="hidden text-left md:block">
                <span className="block text-sm font-medium leading-tight text-foreground">
                  {user.fullName}
                </span>
                <span className="block text-xs leading-tight text-muted-foreground">
                  {user.roleLabel}
                </span>
              </span>
            </button>
          </DropdownTrigger>
          <DropdownContent className="min-w-[14rem]">
            <DropdownLabel>{user.email}</DropdownLabel>
            <DropdownSeparator />
            <Link href="/profile">
              <DropdownItem>
                <User />
                โปรไฟล์ของฉัน
              </DropdownItem>
            </Link>
            <Link href="/preferences">
              <DropdownItem>
                <Settings />
                การตั้งค่าส่วนตัว
              </DropdownItem>
            </Link>
            <DropdownSeparator />
            <form action={logoutAction}>
              <button
                type="submit"
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10 [&_svg]:size-4",
                )}
              >
                <LogOut />
                ออกจากระบบ
              </button>
            </form>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
