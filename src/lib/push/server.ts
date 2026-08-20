import webpush from "web-push";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "R3PjPYRCBdmZv1wACrVhAqCuE4TmnRYHFhr500mHliY";

webpush.setVapidDetails("mailto:wasl@wasl.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type Sql = Awaited<ReturnType<typeof getSql>>;

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
  await sendPushToUser(sql, userId, { title, body, href: href ?? "/" });
}

export async function sendPushToUser(
  sql: Sql,
  userId: string,
  payload: { title: string; body: string; href: string },
) {
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
          { TTL: 60 * 60 * 12, urgency: "high" },
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

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => VAPID_PUBLIC_KEY);

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
