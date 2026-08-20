import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { listNotifications, markNotificationsRead } from "@/lib/social/server";
import { announceNotification, enableBrowserNotifications } from "@/lib/pwa";
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
    refetchInterval: 5000,
  });
  const items = notes.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!items.length) return;
    const newest = items[0]!;
    if (seen.current === 0) {
      seen.current = newest.id;
      return;
    }
    if (newest.id > seen.current && document.hidden) {
      announceNotification({ title: newest.title, body: newest.body, href: newest.href });
    }
    seen.current = Math.max(seen.current, newest.id);
  }, [items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute top-1.5 left-1.5 size-2 rounded-full bg-danger" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <div className="flex items-center justify-between px-2.5 py-2">
          <p className="text-sm font-medium">التنبيهات</p>
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
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-muted">لا تنبيهات بعد</p>
        ) : (
          items.slice(0, 8).map((item) => (
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
            void enableBrowserNotifications();
          }}
        >
          تفعيل تنبيهات الجهاز
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
