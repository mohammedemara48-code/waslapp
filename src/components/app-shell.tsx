import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Hash, House, MessageCircle, Sparkles, UserRound, Users } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { BrandMark } from "@/components/brand-mark";
import { InstallPrompt } from "@/components/install-prompt";
import { MembersRail } from "@/components/members-rail";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "الرئيسية", icon: House, key: "feed" },
  { to: "/rooms", label: "الغرف", icon: Hash, key: "rooms" },
  { to: "/messages", label: "الخاصة", icon: MessageCircle, key: "messages" },
  { to: "/stories", label: "القصص", icon: Sparkles, key: "stories" },
  { to: "/friends", label: "الأصدقاء", icon: Users, key: "friends" },
  { to: "/me", label: "حسابي", icon: UserRound, key: "me" },
] as const;

export function AppShell({
  active,
  children,
  sidebar,
}: {
  active: "rooms" | "messages" | "friends" | "me" | "chat" | "stories" | "tools" | "feed";
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const current = active === "chat" ? "rooms" : active;
  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-surface lg:flex">
        <div className="flex items-center justify-between px-4 py-4">
          <Link to="/" className="outline-none">
            <BrandMark size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <AccountMenu />
          </div>
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
                  "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  on ? "bg-elevated text-fg shadow-glow" : "text-muted hover:bg-elevated/70 hover:text-fg",
                )}
              >
                <Icon className="size-4 text-accent" />
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
          <Link to="/">
            <BrandMark size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            <InstallPrompt compact />
            <NotificationBell />
            <AccountMenu />
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
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs",
                  on ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}