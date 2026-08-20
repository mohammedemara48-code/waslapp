import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { listNotifications, markNotificationsRead } from "@/lib/social/server";
import { announceNotification, enableBrowserNotifications, subscribeWebPush } from "@/lib/pwa";
import { formatClock } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const seen = useRef<number>(0);
  const notes = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: () => (typeof document !== "undefined" && document.hidden ? 4000 : 6000),
  });
  const items = notes.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    void enableBrowserNotifications();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const newest = items[0]!;
    if (seen.current === 0) {
      seen.current = newest.id;
      return;
    }
    if (newest.id > seen.current) {
      const fresh = items.filter((n) => n.id > seen.current && !n.read);
      for (const n of fresh.slice(0, 3).reverse()) {
        announceNotification({ title: n.title, body: n.body, href: n.href });
      }
    }
    seen.current = Math.max(seen.current, newest.id);
  }, [items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="الإشعارات"
          onClick={() => void enableBrowserNotifications()}
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -left-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 text-bg">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <div className="flex items-center justify-between px-2.5 py-2">
          <p className="text-sm font-medium">التنبيهات</p>
          {unread > 0 ? (
            <button
              type="button"
              className="text-xs text-muted hover:text-fg"
              onClick={() => {
                void markNotificationsRead().then(() =>
                  queryClient.invalidateQueries({ queryKey: ["notifications"] }),
                );
              }}
            >
              تعليم كمقروء
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-muted">لا تنبيهات بعد</p>
        ) : (
          items.slice(0, 12).map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <a href={item.href || "/"} className="flex flex-col items-stretch gap-0.5">
                <span className="text-sm">{item.title}</span>
                <span className="text-xs text-muted">{item.body}</span>
                <span className="text-[11px] text-subtle">{formatClock(item.created_at)}</span>
              </a>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void enableBrowserNotifications().then((ok) => {
              if (ok) void subscribeWebPush();
            });
          }}
        >
          تفعيل تنبيهات الجهاز
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
