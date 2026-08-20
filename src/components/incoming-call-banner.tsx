import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { listNotifications, markNotificationsRead } from "@/lib/social/server";
import { parseCallHref, stashCall } from "@/lib/i18n/notices";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { IncomingCallScreen } from "@/components/incoming-call-screen";

export function IncomingCallBanner() {
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const notes = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 2500,
    enabled: Boolean(user),
  });
  const call = (notes.data ?? [])
    .filter((n) => !n.read && n.kind === "call")
    .map((n) => ({ n, parsed: parseCallHref(n.href) }))
    .find((x) => x.parsed);
  const inRoom = Boolean(call?.parsed && path === `/r/${call.parsed.slug}`);

  useEffect(() => {
    if (!call?.parsed || inRoom) return;
    const t = window.setTimeout(() => {
      void markNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
    }, 40000);
    return () => window.clearTimeout(t);
  }, [call?.n.id, inRoom, queryClient]);

  if (!call?.parsed || inRoom) return null;

  return (
    <IncomingCallScreen
      name={call.n.body || call.n.title}
      kind={call.parsed.kind}
      onAccept={() => {
        stashCall({ slug: call.parsed!.slug, kind: call.parsed!.kind, answer: true });
        void markNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
        void navigate({ to: "/r/$slug", params: { slug: call.parsed!.slug } });
      }}
      onReject={() => {
        void markNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }));
      }}
    />
  );
}
