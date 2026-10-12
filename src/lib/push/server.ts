import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";

type Sql = Awaited<ReturnType<typeof getSql>>;

type WebPush = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number; urgency?: string },
  ) => Promise<unknown>;
};

async function getWebPush(): Promise<WebPush | null> {
  if (typeof window !== "undefined") return null;
  const publicKey = (process.env.VITE_VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  if (!publicKey || !privateKey) {
    console.warn(
      "[push] VAPID keys missing — web push disabled until VITE_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set",
    );
    return null;
  }
  try {
    const mod = (await import("web-push")) as { default?: WebPush } & WebPush;
    const webpush = (mod.default ?? mod) as WebPush;
    webpush.setVapidDetails("mailto:wasl@wasl.app", publicKey, privateKey);
    return webpush;
  } catch {
    return null;
  }
}

function readSecret(): string {
  return (process.env.BETTER_AUTH_SECRET || "").trim();
}

/** HMAC token so the service worker can mark one chat read without a session. */
export async function signReadToken(userId: string, href: string): Promise<string> {
  const secret = readSecret();
  if (!secret) return "";
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(`read:${userId}:${href}`).digest("base64url");
}

export async function verifyReadToken(userId: string, href: string, token: string): Promise<boolean> {
  const expected = await signReadToken(userId, href);
  if (!expected || !token || expected.length !== token.length) return false;
  const { timingSafeEqual } = await import("node:crypto");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Run push delivery after the response when on Vercel; never block the caller. */
function runInBackground(task: Promise<unknown>) {
  const safe = task.catch(() => {});
  void import("@vercel/functions")
    .then((m) => m.waitUntil(safe))
    .catch(() => {});
}

export async function notifyUser(
  sql: Sql,
  userId: string,
  kind: string,
  title: string,
  body: string,
  href: string | null,
) {
  await sql`
    insert into notifications (user_id, kind, title, body, href)
    values (${userId}, ${kind}, ${title}, ${body}, ${href})
  `;
  runInBackground(
    (async () => {
      const target = href ?? "/";
      const unread = await sql<{ n: number }>`
        select count(*)::int as n from notifications where user_id = ${userId} and read = false
      `;
      const chat = target.match(/^\/r\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
      const token = chat ? await signReadToken(userId, `/r/${chat}`) : "";
      await sendPushToUser(sql, userId, {
        title,
        body,
        href: target,
        kind,
        tag: kind === "call" ? `call-${chat ?? "x"}` : chat ? `chat-${chat}` : `wasl-${kind}`,
        badge: unread[0]?.n ?? 0,
        uid: userId,
        readHref: chat ? `/r/${chat}` : null,
        readToken: token || null,
      });
    })(),
  );
}

export async function sendPushToUser(
  sql: Sql,
  userId: string,
  payload: Record<string, unknown> & { title: string; body: string; href: string },
) {
  const webpush = await getWebPush();
  if (!webpush) return;
  const rows = await sql<{ endpoint: string; p256dh: string; auth: string }>`
    select endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}
  `;
  if (!rows.length) return;
  const json = JSON.stringify(payload);
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          json,
          { TTL: payload.kind === "call" ? 60 : 60 * 60 * 12, urgency: "high" },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await sql`delete from push_subscriptions where endpoint = ${row.endpoint}`;
        }
      }
    }),
  );
}

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { endpoint: string; keys: { p256dh: string; auth: string } }) => ({
    endpoint: z.string().url().max(2000).parse(input.endpoint),
    p256dh: z.string().min(10).max(200).parse(input.keys.p256dh),
    auth: z.string().min(8).max(200).parse(input.keys.auth),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into push_subscriptions (endpoint, user_id, p256dh, auth)
      values (${data.endpoint}, ${context.userId}, ${data.p256dh}, ${data.auth})
      on conflict (endpoint) do update set user_id = ${context.userId}, p256dh = ${data.p256dh}, auth = ${data.auth}
    `;
    return { ok: true as const };
  });
