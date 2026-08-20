import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Gamepad2,
  Hash,
  House,
  MessageCircle,
  Shield,
  Sparkles,
  Tv,
  UserRound,
  Users,
} from "lucide-react";
import { getMyRole } from "@/lib/admin/server";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useI18n } from "@/lib/i18n";
import { BrandMark } from "@/components/brand-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WaslMenu({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const { t } = useI18n();
  const { user } = useCurrentUserState();
  const role = useQuery({
    queryKey: ["my-role"],
    queryFn: () => getMyRole(),
    enabled: Boolean(user),
  });
  const isAdmin = role.data?.role === "owner" || role.data?.role === "admin";

  const items = [
    { to: "/", label: t.nav_home, icon: House },
    { to: "/rooms", label: t.nav_rooms, icon: Hash },
    { to: "/messages", label: t.nav_messages, icon: MessageCircle },
    { to: "/stories", label: t.nav_stories, icon: Sparkles },
    { to: "/friends", label: t.nav_friends, icon: Users },
    { to: "/tools", label: t.nav_games, icon: Gamepad2 },
    { to: "/broadcast", label: t.nav_broadcast, icon: Tv },
    { to: "/me", label: t.nav_me, icon: UserRound },
  ] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <BrandMark size={size} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <p className="px-2.5 py-2 text-xs text-muted">{t.shortcuts}</p>
        <DropdownMenuSeparator />
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.to} asChild>
              <Link to={item.to}>
                <Icon className="size-4 text-accent" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin">
                <Shield className="size-4 text-accent" />
                {t.nav_admin}
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
