import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Phone, PhoneOff, Video } from "lucide-react";
import { listNotifications, markNotificationsRead } from "@/lib/social/server";
import { parseCallHref, stashCall } from "@/lib/i18n/notices";
import { useI18n } from "@/lib/i18n";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

export function IncomingCallBanner() {
  const { t } = useI18n();
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const notes = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 5000,
    enabled: Boolean(user),
  });
  const call = (notes.data ?? [])
    .filter((n) => !n.read && n.kind === "call")
    .map((n) => ({ n, parsed: parseCallHref(n.href) }))
    .find((x) => x.parsed);
  if (!call?.parsed) return null;
  if (path === `/r/${call.parsed.slug}`) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-accent/50 bg-surface px-4 py-3 shadow-glow">
        {call.parsed.kind === "video" ? <Video className="size-5 text-accent" /> : <Phone className="size-5 text-accent" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t.incoming_call}</p>
          <p className="truncate text-xs text-muted">{call.n.body}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            stashCall({ slug: call.parsed!.slug, kind: call.parsed!.kind, answer: true });
            void markNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
            void navigate({ to: "/r/$slug", params: { slug: call.parsed!.slug } });
          }}
        >
          {t.accept}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            void markNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
          }}
        >
          <PhoneOff className="size-4" />
          {t.reject}
        </Button>
      </div>
    </div>
  );
}
