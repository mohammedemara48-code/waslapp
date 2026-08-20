import { useNavigate } from "@tanstack/react-router";
import { Ban, Flag, MessageCircle, Mic, UserPlus, UserRound, Video, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { sendFriendRequest, openDirect } from "@/lib/social/server";
import { stashCall } from "@/lib/i18n/notices";
import { useI18n } from "@/lib/i18n";
import { blockUser } from "@/lib/live/server";
import { muteUser, reportUser } from "@/lib/engage/server";
import type { ProfileRow } from "@/lib/chat/types";
import { initials } from "@/lib/utils";
import { NameBadge } from "@/components/name-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserActions({
  person,
  children,
}: {
  person: Pick<ProfileRow, "user_id" | "display_name" | "username" | "avatar_url" | "online" | "badge" | "wasl_no" | "role" | "points">;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  async function add() {
    try {
      await sendFriendRequest({ data: person.user_id });
      toast.success(t.add_friend);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الإضافة");
    }
  }

  async function startVoice(kind: "audio" | "video") {
    try {
      const { slug } = await openDirect({ data: person.user_id });
      stashCall({ slug, kind, ring: true });
      await navigate({ to: "/r/$slug", params: { slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.dm);
    }
  }

  async function chat() {
    try {
      const { slug } = await openDirect({ data: person.user_id });
      await navigate({ to: "/r/$slug", params: { slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.dm);
    }
  }

  async function mute() {
    try {
      const res = await muteUser({ data: person.user_id });
      toast.success(res.muted ? "تم الكتم — لن تصلك تنبيهات منه" : "أُلغي الكتم");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الكتم");
    }
  }

  async function report() {
    try {
      await reportUser({ data: { userId: person.user_id, reason: "بلاغ من التطبيق" } });
      toast.success("وصل البلاغ للإدارة");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الإبلاغ");
    }
  }

  async function block() {
    try {
      await blockUser({ data: person.user_id });
      toast.success("تم الحظر");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الحظر");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="size-8">
            {person.avatar_url ? <AvatarImage src={person.avatar_url} alt="" /> : null}
            <AvatarFallback>{initials(person.display_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm">
              {person.display_name} <NameBadge badge={person.badge} role={person.role} points={person.points} />
            </p>
            <p className="truncate text-xs text-muted">
              رقم {person.wasl_no ?? "—"} · @{person.username ?? "بدون"}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: "/u/$userId", params: { userId: person.user_id } })}>
          <UserRound className="size-4" />
          {t.view_profile}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void add()}>
          <UserPlus className="size-4" />
          {t.add_friend}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void chat()}>
          <MessageCircle className="size-4" />
          {t.dm}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void startVoice("audio")}>
          <Mic className="size-4" />
          {t.call_audio}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void startVoice("video")}>
          <Video className="size-4" />
          {t.call_video}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void mute()}>
          <VolumeX className="size-4" />
          {t.mute_alerts}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void report()}>
          <Flag className="size-4" />
          {t.report}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void block()}>
          <Ban className="size-4" />
          {t.block}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OnlineDot({ on }: { on?: boolean }) {
  if (!on) return null;
  return <span className="absolute -bottom-0.5 -left-0.5 size-2.5 rounded-full border-2 border-surface bg-ok" />;
}
