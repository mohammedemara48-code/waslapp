/**
 * "Sign in with Google" via Firebase Auth, bridged into Better Auth (server-only).
 *
 * The browser signs in with Firebase (GoogleAuthProvider popup) and posts the
 * resulting Firebase ID token here. We never trust client claims: the token is
 * verified against Google's public keys (signature, issuer, audience, expiry),
 * must come from the Google provider with a verified email, and only then do we
 * find/create the Better Auth user (linked by verified email) and open a normal
 * Better Auth session, so the rest of the app is unchanged.
 */
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import type { BetterAuthPlugin } from "better-auth";
import { createRemoteJWKSet, jwtVerify } from "jose";
import * as z from "zod";

const PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  "waslapp-6a171";

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export type VerifiedGoogleIdentity = {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
};

export async function verifyFirebaseGoogleToken(idToken: string): Promise<VerifiedGoogleIdentity> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    clockTolerance: 30,
  });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
  if (!sub || sub.length > 128) throw new Error("bad subject");
  if (provider !== "google.com") throw new Error("not a Google sign-in");
  if (payload.email_verified !== true || !email) throw new Error("email not verified");
  // Require a fresh sign-in (guards against replay of an old, stolen token).
  const authTime = typeof payload.auth_time === "number" ? payload.auth_time : 0;
  if (Date.now() / 1000 - authTime > 10 * 60) throw new Error("stale sign-in");
  const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0]!;
  const picture =
    typeof payload.picture === "string" && payload.picture.startsWith("https://")
      ? payload.picture
      : null;
  return { uid: sub, email, name: name.slice(0, 80), picture };
}

export const firebaseGoogle = (): BetterAuthPlugin => ({
  id: "firebase-google",
  endpoints: {
    signInFirebaseGoogle: createAuthEndpoint(
      "/firebase/google",
      { method: "POST", body: z.object({ idToken: z.string().min(20).max(8192) }) },
      async (ctx) => {
        let id: VerifiedGoogleIdentity;
        try {
          id = await verifyFirebaseGoogleToken(ctx.body.idToken);
        } catch {
          return ctx.json({ error: "invalid_token" }, { status: 401 });
        }
        const adapter = ctx.context.internalAdapter;
        const existing = await adapter.findUserByEmail(id.email, { includeAccounts: true });
        let user = existing?.user ?? null;
        if (!user) {
          user = await adapter.createUser({
            email: id.email,
            emailVerified: true,
            name: id.name,
            image: id.picture ?? undefined,
          });
        } else if (!user.emailVerified) {
          user = (await adapter.updateUser(user.id, { emailVerified: true })) ?? user;
        }
        const linked = existing?.accounts?.some(
          (a: { providerId: string; accountId: string }) =>
            a.providerId === "google" && a.accountId === id.uid,
        );
        if (!linked) {
          await adapter.linkAccount({
            userId: user.id,
            providerId: "google",
            accountId: id.uid,
          });
        }
        const session = await adapter.createSession(user.id);
        if (!session) return ctx.json({ error: "session_failed" }, { status: 500 });
        await setSessionCookie(ctx, { session, user });
        return ctx.json({ ok: true, token: session.token });
      },
    ),
  },
});
