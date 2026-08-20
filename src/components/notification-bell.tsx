import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { listNotifications, markNotificationsRead } from "@/lib/social/server";
import { announceNotification, enableBrowserNotifications, subscribeWebPush } from "@/lib/pwa";
import { formatClock } from "@/lib/utils";
import { localizeNotice, parseCallHref, stashCall } from "@/lib/i18n/notices";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationBell() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
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
    if (!items.length) return;
    const newest = items[0]!;
    if (seen.current === 0) {
      seen.current = newest.id;
      return;
    }
    if (newest.id > seen.current) {
      const fresh = items.filter((n) => n.id > seen.current && !n.read);
      for (const n of fresh.slice(0, 3).reverse()) {
        const text = localizeNotice(n.kind, n.title, n.body, t, locale);
        announceNotification({ title: text.title, body: text.body, href: n.href });
      }
    }
    seen.current = Math.max(seen.current, newest.id);
  }, [items, t, locale]);

  function markAll() {
    void markNotificationsRead().then(() => {
      queryClient.setQueryData(["notifications"], (prev: typeof items | undefined) =>
        (prev ?? items).map((n) => ({ ...n, read: true })),
      );
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unread > 0) markAll();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t.notifications}>
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
          <p className="text-sm font-medium">{t.alerts}</p>
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-sm text-muted">{t.no_alerts}</p>
        ) : (
          items.slice(0, 12).map((item) => {
            const text = localizeNotice(item.kind, item.title, item.body, t, locale);
            const call = item.kind === "call" ? parseCallHref(item.href) : null;
            if (call) {
              return (
                <div key={item.id} className="space-y-1.5 px-2.5 py-2">
                  <p className="text-sm">{text.title}</p>
                  <p className="text-xs text-muted">{text.body}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        stashCall({ slug: call.slug, kind: call.kind, answer: true });
                        void navigate({ to: "/r/$slug", params: { slug: call.slug } });
                      }}
                    >
                      {t.accept}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => markAll()}>
                      {t.reject}
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <DropdownMenuItem key={item.id} asChild>
                <a href={item.href || "/"} className="flex flex-col items-stretch gap-0.5">
                  <span className="text-sm">{text.title}</span>
                  <span className="text-xs text-muted">{text.body}</span>
                  <span className="text-[11px] text-subtle">{formatClock(item.created_at)}</span>
                </a>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void enableBrowserNotifications().then((ok) => {
              if (ok) void subscribeWebPush();
            });
          }}
        >
          {t.enable_push}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
