import { createAuthClient } from "better-auth/react";
import { AUTH_SOCIAL_PROVIDERS } from "./providers";

/**
 * Better Auth client for waslapp (browser-side).
 *
 * Talks to this app's own Better Auth at same-origin `/api/auth/*`.
 * Optional bearer token in sessionStorage helps multi-account switch;
 * cookie auth is the primary path in production.
 */
export const authClient = createAuthClient({
  fetchOptions: {
    onRequest(ctx) {
      const token = getBearerToken();
      if (token) ctx.headers.set("Authorization", `Bearer ${token}`);
      return ctx;
    },
  },
});

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/** Social providers to render (empty = phone/email password only). */
export { AUTH_SOCIAL_PROVIDERS };
/** @deprecated Use AUTH_SOCIAL_PROVIDERS — kept empty for old imports. */
export const GROK_PROVIDERS = AUTH_SOCIAL_PROVIDERS;

const BEARER_KEY = "wasl-auth.bearer-token";
/** Legacy key from the Grok sandbox template — cleared on sign-out. */
const LEGACY_BEARER_KEY = "grok-auth.bearer-token";

export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem(BEARER_KEY) ||
      window.sessionStorage.getItem(LEGACY_BEARER_KEY) ||
      window.localStorage.getItem(LEGACY_BEARER_KEY)
    );
  } catch {
    return null;
  }
}

export function setBearerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(BEARER_KEY, token);
    else window.sessionStorage.removeItem(BEARER_KEY);
    window.sessionStorage.removeItem(LEGACY_BEARER_KEY);
    window.localStorage.removeItem(LEGACY_BEARER_KEY);
    window.localStorage.removeItem(BEARER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function onPublicDeploy(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".vercel.app") || host.endsWith(".wasl.app");
}

/** Social OAuth is not configured for waslapp standalone. */
export async function signIn(
  _providerId: string,
  _opts: { callbackURL?: string; errorCallbackURL?: string } = {},
): Promise<void> {
  throw new Error("تسجيل الدخول الاجتماعي غير متاح — استخدم رقم الجوال وكلمة المرور");
}

export async function signOut(redirectTo = "/"): Promise<void> {
  try {
    await authClient.signOut();
  } finally {
    setBearerToken(null);
  }
  window.location.href = redirectTo;
}
