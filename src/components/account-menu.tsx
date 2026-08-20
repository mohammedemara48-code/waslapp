import { Link } from "@tanstack/react-router";
import { Gamepad2, LogOut, Shield, Tv, UserRound } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useQuery } from "@tanstack/react-query";
import { getMyRole } from "@/lib/admin/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function AccountMenu() {
  const { t } = useI18n();
  const { user, isPending } = useCurrentUserState();
  const role = useQuery({
    queryKey: ["my-role"],
    queryFn: () => getMyRole(),
    enabled: Boolean(user),
  });
  if (isPending) {
    return <div className="size-9 animate-pulse rounded-full bg-elevated" />;
  }
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? t.account;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Avatar className="size-9">
            {user.profileImageUrl ? <AvatarImage src={user.profileImageUrl} alt="" /> : null}
            <AvatarFallback>{initials(label)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm text-fg md:inline">{label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium">{label}</p>
          {user.primaryEmail ? <p className="text-xs text-muted">{user.primaryEmail}</p> : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/me">
            <UserRound className="size-4" />
            {t.profile}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/tools">
            <Gamepad2 className="size-4" />
            {t.nav_games}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/broadcast">
            <Tv className="size-4" />
            {t.nav_broadcast}
          </Link>
        </DropdownMenuItem>
        {role.data?.role === "owner" || role.data?.role === "admin" ? (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Shield className="size-4" />
              {t.nav_admin}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => void signOut("/login")}>
          <LogOut className="size-4" />
          {t.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
