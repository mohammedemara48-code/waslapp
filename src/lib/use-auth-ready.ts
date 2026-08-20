import { useEffect, useState } from "react";
import { useCurrentUserState, type CurrentUserState } from "@/lib/auth/use-current-user";

/** Keeps the first client paint identical to SSR so auth gates do not hydrate-mismatch. */
export function useAuthReady(): CurrentUserState {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const state = useCurrentUserState();
  if (!ready) return { user: null, isPending: true };
  return state;
}
