"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { NOTIFICATION_LABELS } from "@/lib/constants";
import { markNotificationReadAction, markAllReadAction } from "./actions";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function NotificationsClient({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const unreadCount = items.filter((n) => !n.readAt).length;

  const filtered = filter === "unread" ? items.filter((n) => !n.readAt) : items;

  async function onClickItem(n: NotificationItem) {
    if (!n.readAt) await markNotificationReadAction(n.id);
    if (n.link) router.push(n.link);
    else router.refresh();
  }

  async function onMarkAll() {
    await markAllReadAction();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
          <button
            onClick={() => setFilter("all")}
            className={cn("rounded px-3 py-1.5 text-sm", filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn("rounded px-3 py-1.5 text-sm", filter === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            ยังไม่อ่าน {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onMarkAll}>
            <CheckCheck /> ทำเครื่องหมายอ่านทั้งหมด
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Bell />} title={filter === "unread" ? "ไม่มีการแจ้งเตือนที่ยังไม่อ่าน" : "ยังไม่มีการแจ้งเตือน"} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <ul className="divide-y divide-border">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => onClickItem(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-muted transition-colors",
                    !n.readAt && "bg-accent/30",
                  )}
                >
                  <div className="mt-1 shrink-0">
                    {n.readAt ? (
                      <span className="block size-2 rounded-full bg-transparent" />
                    ) : (
                      <Circle className="size-2 fill-primary text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {NOTIFICATION_LABELS[n.type] ?? n.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: th })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">{n.title}</p>
                    {n.body && <p className="truncate text-sm text-muted-foreground">{n.body}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
