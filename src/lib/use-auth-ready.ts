import { useEffect, useState } from "react";
import { useCurrentUserState, type CurrentUserState } from "@/lib/auth/use-current-user";

/** Keeps the first client paint identical to SSR so auth gates do not hydrate-mismatch. */
export function useAuthReady(): CurrentUserState {
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setReady(true);
    const t = window.setTimeout(() => setTimedOut(true), 4000);
    return () => window.clearTimeout(t);
  }, []);
  const state = useCurrentUserState();
  if (!ready) return { user: null, isPending: true };
  if (state.isPending && timedOut) return { user: state.user, isPending: false };
  return state;
}
