import { useEffect } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { heartbeat } from "@/lib/live/server";

export function PresenceHeartbeat() {
  const { user, isPending } = useCurrentUserState();
  useEffect(() => {
    if (isPending || !user) return;
    void heartbeat();
    const t = window.setInterval(() => {
      void heartbeat();
    }, 20_000);
    return () => window.clearInterval(t);
  }, [isPending, user]);
  return null;
}
