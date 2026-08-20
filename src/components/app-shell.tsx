import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hash, House, MessageCircle, Sparkles, UserRound, Users, Gamepad2, Tv } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { InstallPrompt } from "@/components/install-prompt";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MembersRail } from "@/components/members-rail";
import { NotificationBell } from "@/components/notification-bell";
import { WaslMenu } from "@/components/wasl-menu";
import { CountDot } from "@/components/inbox-badge";
import { getInboxCounts } from "@/lib/engage/server";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppShell({
  active,
  children,
  sidebar,
}: {
  active: "rooms" | "messages" | "friends" | "me" | "chat" | "stories" | "tools" | "feed" | "broadcast";
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const { t } = useI18n();
  const current = active === "chat" ? "rooms" : active;
  const counts = useQuery({
    queryKey: ["inbox"],
    queryFn: () => getInboxCounts(),
    refetchInterval: 8000,
  });
  const dms = counts.data?.dms ?? 0;

  const NAV = [
    { to: "/", label: t.nav_home, icon: House, key: "feed" },
    { to: "/rooms", label: t.nav_rooms, icon: Hash, key: "rooms" },
    { to: "/messages", label: t.nav_messages, icon: MessageCircle, key: "messages" },
    { to: "/stories", label: t.nav_stories, icon: Sparkles, key: "stories" },
    { to: "/friends", label: t.nav_friends, icon: Users, key: "friends" },
    { to: "/me", label: t.nav_me, icon: UserRound, key: "me" },
  ] as const;

  const headerActions = (
    <div className="flex items-center gap-1">
      <Link
        to="/tools"
        className="grid size-9 place-items-center rounded-md text-muted hover:bg-elevated hover:text-fg"
        aria-label={t.nav_games}
      >
        <Gamepad2 className="size-4" />
      </Link>
      <Link
        to="/broadcast"
        className="grid size-9 place-items-center rounded-md text-muted hover:bg-elevated hover:text-fg"
        aria-label={t.nav_broadcast}
      >
        <Tv className="size-4" />
      </Link>
      <LanguageSwitcher />
      <NotificationBell />
      <AccountMenu />
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-surface lg:flex">
        <div className="flex items-center justify-between px-4 py-4">
          <WaslMenu size="sm" />
          {headerActions}
        </div>
        <nav className="grid gap-1 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = current === item.key;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  on ? "bg-elevated text-fg shadow-glow" : "text-muted hover:bg-elevated/70 hover:text-fg",
                )}
              >
                <span className="relative">
                  <Icon className="size-4 text-accent" />
                  {item.key === "messages" ? <CountDot n={dms} /> : null}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-3">
          <InstallPrompt />
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-4">
          {sidebar}
          <MembersRail />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
          <WaslMenu size="sm" />
          <div className="flex items-center gap-1">
            <InstallPrompt compact />
            {headerActions}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        <nav className="grid grid-cols-6 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = current === item.key;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs",
                  on ? "text-accent" : "text-muted",
                )}
              >
                <span className="relative">
                  <Icon className="size-4" />
                  {item.key === "messages" ? <CountDot n={dms} /> : null}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
