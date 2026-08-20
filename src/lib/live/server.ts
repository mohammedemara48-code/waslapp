import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { STICKERS } from "@/lib/stickers";
import type { ProfileRow, StoryRow } from "@/lib/chat/types";

function displayAvatar(row: { avatar_data?: string | null; avatar_url?: string | null }): string | null {
  return row.avatar_data || row.avatar_url || null;
}

function mapProfile(row: {
  user_id: string;
  username: string | null;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatar_url: string | null;
  avatar_data?: string | null;
  last_seen?: string | null;
  online?: boolean | number;
  badge?: string | null;
  wasl_no?: number | null;
}): ProfileRow {
  return {
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    bio: row.bio ?? null,
    avatar_url: displayAvatar(row),
    last_seen: row.last_seen ?? null,
    online: Boolean(row.online),
    badge: row.badge ?? null,
    wasl_no: row.wasl_no ?? null,
  };
}

async function notify(
  sql: Awaited<ReturnType<typeof getSql>>,
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
}

export const heartbeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const prev = await sql<{ last_seen: string | null; presence_notified_at: string | null; display_name: string }>`
      select last_seen, presence_notified_at, display_name from profiles where user_id = ${context.userId} limit 1
    `;
    await sql`update profiles set last_seen = now() where user_id = ${context.userId}`;
    const last = prev[0]?.last_seen ? new Date(prev[0].last_seen).getTime() : 0;
    const notified = prev[0]?.presence_notified_at ? new Date(prev[0].presence_notified_at).getTime() : 0;
    const now = Date.now();
    const wasAway = !last || now - last > 120_000;
    const canPing = !notified || now - notified > 10 * 60_000;
    if (wasAway && canPing) {
      await sql`update profiles set presence_notified_at = now() where user_id = ${context.userId}`;
      const friends = await sql<{ user_id: string }>`
        select case when requester_id = ${context.userId} then addressee_id else requester_id end as user_id
        from friendships
        where status = 'accepted'
          and (requester_id = ${context.userId} or addressee_id = ${context.userId})
      `;
      const name = prev[0]?.display_name ?? "صديقك";
      for (const f of friends) {
        await notify(sql, f.user_id, "presence", `${name} متصل الآن`, "ادخل وابدأ حديثاً.", "/friends");
      }
    }
    return { ok: true as const };
  });

export const listOnline = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      username: string | null;
      display_name: string;
      email: string | null;
      phone: string | null;
      bio: string | null;
      avatar_url: string | null;
      avatar_data: string | null;
      last_seen: string | null;
      badge: string | null;
      wasl_no: number | null;
    }>`
      select p.user_id, p.username, p.display_name, p.email, p.phone, p.bio, p.avatar_url, p.avatar_data, p.last_seen, p.badge, p.wasl_no
      from profiles p
      where p.user_id <> ${context.userId}
        and p.last_seen > now() - interval '45 seconds'
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
        )
      order by p.last_seen desc
      limit 24
    `;
    return rows.map((r) => mapProfile({ ...r, online: true }));
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      username: string | null;
      display_name: string;
      email: string | null;
      phone: string | null;
      bio: string | null;
      avatar_url: string | null;
      avatar_data: string | null;
      last_seen: string | null;
      online: boolean;
      badge: string | null;
      wasl_no: number | null;
    }>`
      select
        p.user_id, p.username, p.display_name, p.email, p.phone, p.bio, p.avatar_url, p.avatar_data, p.last_seen,
        (p.last_seen > now() - interval '45 seconds') as online,
        p.badge, p.wasl_no
      from profiles p
      where not exists (
        select 1 from blocks b
        where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
      )
      order by (p.last_seen > now() - interval '45 seconds') desc, p.display_name
      limit 200
    `;
    return rows.map((r) => mapProfile(r));
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((userId: string) => z.string().min(1).max(80).parse(userId))
  .handler(async ({ context, data: userId }) => {
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      username: string | null;
      display_name: string;
      email: string | null;
      phone: string | null;
      bio: string | null;
      avatar_url: string | null;
      avatar_data: string | null;
      last_seen: string | null;
      badge: string | null;
      wasl_no: number | null;
    }>`
      select user_id, username, display_name, email, phone, bio, avatar_url, avatar_data, last_seen, badge, wasl_no
      from profiles where user_id = ${userId} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("الحساب غير موجود");
    const blocked = await sql<{ blocker_id: string }>`
      select blocker_id from blocks
      where (blocker_id = ${context.userId} and blocked_id = ${userId})
         or (blocker_id = ${userId} and blocked_id = ${context.userId})
      limit 1
    `;
    const friend = await sql<{ status: string }>`
      select status from friendships
      where status = 'accepted'
        and (
          (requester_id = ${context.userId} and addressee_id = ${userId})
          or (requester_id = ${userId} and addressee_id = ${context.userId})
        )
      limit 1
    `;
    const online = row.last_seen ? Date.now() - new Date(row.last_seen).getTime() < 45_000 : false;
    return {
      profile: mapProfile({ ...row, online }),
      blocked: Boolean(blocked[0]),
      friends: Boolean(friend[0]),
      mine: userId === context.userId,
    };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => z.string().min(1).max(80).parse(userId))
  .handler(async ({ context, data: otherId }) => {
    if (otherId === context.userId) throw new Error("لا يمكن حظر نفسك");
    const sql = await getSql();
    await sql`
      insert into blocks (blocker_id, blocked_id)
      values (${context.userId}, ${otherId})
      on conflict (blocker_id, blocked_id) do nothing
    `;
    return { ok: true as const };
  });

export const notifyRoomPresence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { slug: string; name: string }) => ({
    slug: z.string().min(2).max(32).parse(input.slug),
    name: input.name.trim().slice(0, 40),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await sql<{ display_name: string }>`
      select display_name from profiles where user_id = ${context.userId} limit 1
    `;
    const friends = await sql<{ user_id: string }>`
      select case when requester_id = ${context.userId} then addressee_id else requester_id end as user_id
      from friendships
      where status = 'accepted'
        and (requester_id = ${context.userId} or addressee_id = ${context.userId})
    `;
    const href = `/r/${data.slug}`;
    for (const f of friends) {
      const recent = await sql<{ id: number }>`
        select id from notifications
        where user_id = ${f.user_id} and kind = 'presence' and href = ${href}
          and created_at > now() - interval '15 minutes'
        limit 1
      `;
      if (recent[0]) continue;
      await notify(
        sql,
        f.user_id,
        "presence",
        `${me[0]?.display_name ?? "صديقك"} في ${data.name}`,
        "ادخل الغرفة إن أحببت الحديث.",
        href,
      );
    }
    return { ok: true as const };
  });

export const listStories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      user_id: string;
      kind: string;
      body: string;
      image_data: string | null;
      tint: string;
      created_at: string;
      display_name: string;
      avatar_url: string | null;
      avatar_data: string | null;
      username: string | null;
      likes: number;
      liked: number;
      views: number;
    }>`
      select
        s.id, s.user_id, s.kind, s.body, s.image_data, s.tint, s.created_at,
        p.display_name, p.avatar_url, p.avatar_data, p.username,
        (select count(*)::int from story_likes l where l.story_id = s.id) as likes,
        (select count(*)::int from story_likes l where l.story_id = s.id and l.user_id = ${context.userId}) as liked,
        (select count(*)::int from story_views v where v.story_id = s.id) as views
      from stories s
      join profiles p on p.user_id = s.user_id
      where s.created_at > now() - interval '24 hours'
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = s.user_id)
             or (b.blocker_id = s.user_id and b.blocked_id = ${context.userId})
        )
        and (
          s.user_id = ${context.userId}
          or exists (
            select 1 from friendships f
            where f.status = 'accepted'
              and (
                (f.requester_id = ${context.userId} and f.addressee_id = s.user_id)
                or (f.requester_id = s.user_id and f.addressee_id = ${context.userId})
              )
          )
        )
      order by s.created_at desc
      limit 80
    `;
    return rows.map(
      (r): StoryRow => ({
        id: r.id,
        user_id: r.user_id,
        kind: r.kind,
        body: r.body,
        image_data: r.image_data,
        tint: r.tint,
        created_at: r.created_at,
        display_name: r.display_name,
        avatar_url: displayAvatar(r),
        username: r.username,
        likes: r.likes,
        liked: r.liked > 0,
        views: r.views,
      }),
    );
  });

export const publishStory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: "text" | "image" | "video"; body?: string; imageData?: string | null; tint?: string }) => {
    const kind = input.kind;
    const body = (input.body ?? "").trim().slice(0, 140);
    const imageData = input.imageData ?? null;
    const tint = (input.tint ?? "ink").slice(0, 80);
    if (kind === "text" && !body) throw new Error("اكتب سطراً للقصة");
    if (kind === "image" && !imageData) throw new Error("اختر صورة");
    if (kind === "video" && !imageData) throw new Error("اختر مقطعاً");
    if (imageData && imageData.length > 4_000_000) throw new Error("الملف كبير");
    return { kind, body, imageData, tint };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into stories (user_id, kind, body, image_data, tint)
      values (${context.userId}, ${data.kind}, ${data.body}, ${data.imageData}, ${data.tint})
    `;
    const friends = await sql<{ user_id: string }>`
      select case when requester_id = ${context.userId} then addressee_id else requester_id end as user_id
      from friendships
      where status = 'accepted'
        and (requester_id = ${context.userId} or addressee_id = ${context.userId})
    `;
    const me = await sql<{ display_name: string }>`
      select display_name from profiles where user_id = ${context.userId} limit 1
    `;
    for (const f of friends) {
      await notify(sql, f.user_id, "story", `قصة جديدة من ${me[0]?.display_name ?? "صديقك"}`, "شاهدها قبل أن تختفي.", "/stories");
    }
    return { ok: true as const };
  });

export const likeStory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const existing = await sql<{ user_id: string }>`
      select user_id from story_likes where story_id = ${id} and user_id = ${context.userId} limit 1
    `;
    if (existing[0]) {
      await sql`delete from story_likes where story_id = ${id} and user_id = ${context.userId}`;
    } else {
      await sql`insert into story_likes (story_id, user_id) values (${id}, ${context.userId})`;
    }
    return { ok: true as const };
  });

export const viewStory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`
      insert into story_views (story_id, user_id)
      values (${id}, ${context.userId})
      on conflict (story_id, user_id) do nothing
    `;
    return { ok: true as const };
  });

export const sendSticker = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { slug: string; stickerId: string }) => {
    const slug = z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/).parse(input.slug);
    const sticker = STICKERS.find((s) => s.id === input.stickerId);
    if (!sticker) throw new Error("الاستيكر غير موجود");
    return { slug, stickerId: sticker.id, label: sticker.label };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: number; kind: string }>`
      select id, kind from rooms where slug = ${data.slug} limit 1
    `;
    const room = rooms[0];
    if (!room) throw new Error("الغرفة غير موجودة");
    if (room.kind === "dm") {
      const mine = await sql<{ user_id: string }>`
        select user_id from room_members where room_id = ${room.id} and user_id = ${context.userId} limit 1
      `;
      if (!mine[0]) throw new Error("هذه محادثة خاصة");
    }
    const body = `هدية: ${data.label}`;
    const rows = await sql<{
      id: number;
      room_id: number;
      user_id: string;
      body: string;
      created_at: string;
    }>`
      insert into messages (room_id, user_id, body, attachment_name, attachment_type, attachment_data)
      values (${room.id}, ${context.userId}, ${body}, ${data.stickerId}, 'sticker', ${data.label})
      returning id, room_id, user_id, body, created_at
    `;
    const saved = rows[0];
    if (!saved) throw new Error("تعذر الإرسال");
    const profiles = await sql<{ display_name: string; avatar_url: string | null; avatar_data: string | null }>`
      select display_name, avatar_url, avatar_data from profiles where user_id = ${context.userId} limit 1
    `;
    if (room.kind === "dm") {
      const others = await sql<{ user_id: string }>`
        select user_id from room_members where room_id = ${room.id} and user_id <> ${context.userId}
      `;
      for (const other of others) {
        await notify(sql, other.user_id, "gift", profiles[0]?.display_name ?? "هدية", body, `/r/${data.slug}`);
      }
    }
    return {
      id: saved.id,
      room_id: saved.room_id,
      user_id: saved.user_id,
      body: saved.body,
      created_at: saved.created_at,
      display_name: profiles[0]?.display_name ?? "ضيف",
      avatar_url: displayAvatar(profiles[0] ?? {}),
      attachment_name: data.stickerId,
      attachment_type: "sticker",
      attachment_data: data.label,
    };
  });
