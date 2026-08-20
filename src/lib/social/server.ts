import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { FriendshipRow, NotificationRow, ProfileRow, RoomRow } from "@/lib/chat/types";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "اسم المستخدم قصير")
  .max(20, "اسم المستخدم طويل")
  .regex(/^[\p{L}\p{N}_.]+$/u, "استخدم حروفاً أو أرقاماً أو _");

function displayAvatar(row: { avatar_data?: string | null; avatar_url?: string | null }): string | null {
  return row.avatar_data || row.avatar_url || null;
}

function mapProfile(row: {
  user_id: string;
  username: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_data?: string | null;
  last_seen?: string | null;
  online?: boolean | number;
  badge?: string | null;
  wasl_no?: number | null;
  role?: string | null;
  points?: number | null;
}): ProfileRow {
  return {
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    email: row.email,
    phone: row.phone,
    bio: row.bio,
    avatar_url: displayAvatar(row),
    last_seen: row.last_seen ?? null,
    online: Boolean(row.online),
    badge: row.badge ?? null,
    wasl_no: row.wasl_no ?? null,
    role: row.role ?? null,
    points: row.points ?? 0,
  };
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ProfileRow | null> => {
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
      wasl_no: number | null;
      role: string | null;
      points: number | null;
    }>`
      select user_id, username, display_name, email, phone, bio, avatar_url, avatar_data, wasl_no, role, coalesce(points, 0)::int as points
      from profiles where user_id = ${context.userId} limit 1
    `;
    return rows[0] ? mapProfile(rows[0]) : null;
  });

export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { displayName?: string | null; email?: string | null; avatarUrl?: string | null }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ user_id: string; username: string | null }>`
      select user_id, username from profiles where user_id = ${context.userId} limit 1
    `;
    const fallbackName = (data.displayName ?? "").trim() || "ضيف";
    const seedUser =
      existing[0]?.username ||
      `u${context.userId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || Math.random().toString(36).slice(2, 8)}`;
    if (!existing[0]) {
      await sql`
        insert into profiles (user_id, display_name, email, avatar_url, username, updated_at)
        values (${context.userId}, ${fallbackName}, ${data.email ?? null}, ${data.avatarUrl ?? null}, ${seedUser}, now())
        on conflict (user_id) do nothing
      `;
    } else {
      await sql`
        update profiles
        set
          email = coalesce(email, ${data.email ?? null}),
          avatar_url = coalesce(avatar_url, ${data.avatarUrl ?? null}),
          username = coalesce(username, ${seedUser}),
          updated_at = now()
        where user_id = ${context.userId}
      `;
    }
    const owners = await sql<{ user_id: string }>`
      select user_id from profiles where role = 'owner' limit 1
    `;
    if (!owners[0]) {
      await sql`update profiles set role = 'owner' where user_id = ${context.userId}`;
    }
    await sql`update profiles set wasl_no = nextval('wasl_no_seq') where wasl_no is null`;
    return { ok: true as const };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    username: string;
    displayName: string;
    phone?: string;
    bio?: string;
    avatarData?: string | null;
  }) => {
    const username = usernameSchema.parse(input.username);
    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 40) throw new Error("الاسم المستعار غير صالح");
    const phone = (input.phone ?? "").replace(/\D/g, "");
    if (phone && (phone.length < 10 || phone.length > 15)) throw new Error("رقم الجوال غير صالح");
    const bio = (input.bio ?? "").trim().slice(0, 180);
    const avatarData = input.avatarData === undefined ? undefined : input.avatarData;
    if (avatarData && avatarData.length > 900_000) throw new Error("الصورة كبيرة");
    return { username, displayName, phone: phone || null, bio, avatarData };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`
      select user_id from profiles
      where lower(username) = lower(${data.username}) and user_id <> ${context.userId}
      limit 1
    `;
    if (taken[0]) throw new Error("اسم المستخدم محجوز");
    if (data.avatarData !== undefined) {
      await sql`
        update profiles
        set username = ${data.username},
            display_name = ${data.displayName},
            phone = ${data.phone},
            bio = ${data.bio},
            avatar_data = ${data.avatarData},
            updated_at = now()
        where user_id = ${context.userId}
      `;
    } else {
      await sql`
        update profiles
        set username = ${data.username},
            display_name = ${data.displayName},
            phone = ${data.phone},
            bio = ${data.bio},
            updated_at = now()
        where user_id = ${context.userId}
      `;
    }
    const rows = await sql<{
      user_id: string;
      username: string | null;
      display_name: string;
      email: string | null;
      phone: string | null;
      bio: string | null;
      avatar_url: string | null;
      avatar_data: string | null;
    }>`
      select user_id, username, display_name, email, phone, bio, avatar_url, avatar_data
      from profiles where user_id = ${context.userId} limit 1
    `;
    return rows[0] ? mapProfile(rows[0]) : null;
  });

export const claimLocalAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string; phone: string; displayName?: string }) => {
    const username = usernameSchema.parse(input.username);
    const phone = input.phone.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) throw new Error("رقم الجوال غير صالح");
    const displayName = (input.displayName ?? username).trim().slice(0, 40) || username;
    return { username, phone, displayName };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`
      select user_id from profiles
      where lower(username) = lower(${data.username}) and user_id <> ${context.userId}
      limit 1
    `;
    if (taken[0]) throw new Error("اسم المستخدم محجوز");
    await sql`
      insert into profiles (user_id, display_name, username, phone, updated_at)
      values (${context.userId}, ${data.displayName}, ${data.username}, ${data.phone}, now())
      on conflict (user_id) do update set
        username = excluded.username,
        phone = excluded.phone,
        display_name = excluded.display_name,
        updated_at = now()
    `;
    return { ok: true as const };
  });

export const searchPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((q: string) => q.trim().slice(0, 40))
  .handler(async ({ context, data: q }) => {
    if (q.length < 1) return [] as ProfileRow[];
    const sql = await getSql();
    const like = `%${q}%`;
    const asNo = /^\d+$/.test(q) ? Number(q) : 0;
    const rows = await sql<{
      user_id: string;
      username: string | null;
      display_name: string;
      email: string | null;
      phone: string | null;
      bio: string | null;
      avatar_url: string | null;
      avatar_data: string | null;
      wasl_no: number | null;
      role: string | null;
      points: number | null;
    }>`
      select user_id, username, display_name, email, phone, bio, avatar_url, avatar_data, wasl_no, role, coalesce(points, 0)::int as points
      from profiles
      where user_id <> ${context.userId}
        and (
          username ilike ${like}
          or display_name ilike ${like}
          or (${asNo} > 0 and wasl_no = ${asNo})
        )
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = profiles.user_id)
             or (b.blocker_id = profiles.user_id and b.blocked_id = ${context.userId})
        )
      order by display_name
      limit 20
    `;
    return rows.map(mapProfile);
  });

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

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => z.string().min(1).max(80).parse(userId))
  .handler(async ({ context, data: otherId }) => {
    if (otherId === context.userId) throw new Error("لا يمكن إضافة نفسك");
    const sql = await getSql();
    const existing = await sql<{ id: number; status: string; requester_id: string }>`
      select id, status, requester_id from friendships
      where (requester_id = ${context.userId} and addressee_id = ${otherId})
         or (requester_id = ${otherId} and addressee_id = ${context.userId})
      limit 1
    `;
    const row = existing[0];
    if (row?.status === "accepted") throw new Error("أنتما أصدقاء بالفعل");
    if (row?.status === "pending") throw new Error("الطلب موجود مسبقاً");
    await sql`
      insert into friendships (requester_id, addressee_id, status)
      values (${context.userId}, ${otherId}, 'pending')
    `;
    const me = await sql<{ display_name: string; username: string | null }>`
      select display_name, username from profiles where user_id = ${context.userId} limit 1
    `;
    const label = me[0]?.display_name || me[0]?.username || "شخص";
    await notify(sql, otherId, "friend", "طلب صداقة", `${label} يريد إضافتك.`, "/friends");
    return { ok: true as const };
  });

export const respondFriend = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; accept: boolean }) => ({
    id: z.number().int().positive().parse(input.id),
    accept: Boolean(input.accept),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number; requester_id: string; addressee_id: string }>`
      select id, requester_id, addressee_id from friendships
      where id = ${data.id} and addressee_id = ${context.userId} and status = 'pending'
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("الطلب غير موجود");
    const status = data.accept ? "accepted" : "declined";
    await sql`update friendships set status = ${status} where id = ${row.id}`;
    if (data.accept) {
      const me = await sql<{ display_name: string }>`
        select display_name from profiles where user_id = ${context.userId} limit 1
      `;
      await notify(
        sql,
        row.requester_id,
        "friend",
        "قُبلت الصداقة",
        `${me[0]?.display_name ?? "صديقك"} قبل طلبك.`,
        "/friends",
      );
    }
    return { ok: true as const };
  });

export const listFriends = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ friends: FriendshipRow[]; incoming: FriendshipRow[] }> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      status: string;
      created_at: string;
      requester_id: string;
      addressee_id: string;
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
      role: string | null;
      points: number | null;
    }>`
      select
        f.id, f.status, f.created_at, f.requester_id, f.addressee_id,
        p.user_id, p.username, p.display_name, p.email, p.phone, p.bio, p.avatar_url, p.avatar_data,
        p.last_seen,
        (p.last_seen > now() - interval '45 seconds') as online,
        p.badge, p.wasl_no, p.role, coalesce(p.points, 0)::int as points
      from friendships f
      join profiles p on p.user_id = case
        when f.requester_id = ${context.userId} then f.addressee_id
        else f.requester_id
      end
      where (f.requester_id = ${context.userId} or f.addressee_id = ${context.userId})
        and f.status in ('pending', 'accepted')
      order by f.created_at desc
    `;
    const friends: FriendshipRow[] = [];
    const incoming: FriendshipRow[] = [];
    for (const row of rows) {
      const item: FriendshipRow = {
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        incoming: row.addressee_id === context.userId,
        peer: mapProfile(row),
      };
      if (row.status === "accepted") friends.push(item);
      else if (item.incoming) incoming.push(item);
    }
    return { friends, incoming };
  });

function dmSlug(a: string, b: string): string {
  const [x, y] = a < b ? [a, b] : [b, a];
  let h = 2166136261;
  const raw = `${x}:${y}`;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const id = (h >>> 0).toString(36);
  return `dm${id}`.slice(0, 32);
}

export const openDirect = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => z.string().min(1).max(80).parse(userId))
  .handler(async ({ context, data: otherId }) => {
    if (otherId === context.userId) throw new Error("اختر صديقاً آخر");
    const sql = await getSql();
    const bond = await sql<{ id: number }>`
      select id from friendships
      where status = 'accepted'
        and (
          (requester_id = ${context.userId} and addressee_id = ${otherId})
          or (requester_id = ${otherId} and addressee_id = ${context.userId})
        )
      limit 1
    `;
    if (!bond[0]) throw new Error("المحادثة الخاصة للأصدقاء فقط");
    const slug = dmSlug(context.userId, otherId);
    const rooms = await sql<{ slug: string }>`select slug from rooms where slug = ${slug} limit 1`;
    if (!rooms[0]) {
      const other = await sql<{ display_name: string }>`
        select display_name from profiles where user_id = ${otherId} limit 1
      `;
      const me = await sql<{ display_name: string }>`
        select display_name from profiles where user_id = ${context.userId} limit 1
      `;
      const name = `${me[0]?.display_name ?? "أنت"} و ${other[0]?.display_name ?? "صديق"}`;
      const inserted = await sql<{ id: number }>`
        insert into rooms (slug, name, description, kind, created_by)
        values (${slug}, ${name}, 'محادثة خاصة', 'dm', ${context.userId})
        returning id
      `;
      const roomId = inserted[0]?.id;
      if (roomId) {
        await sql`insert into room_members (room_id, user_id) values (${roomId}, ${context.userId}) on conflict (room_id, user_id) do nothing`;
        await sql`insert into room_members (room_id, user_id) values (${roomId}, ${otherId}) on conflict (room_id, user_id) do nothing`;
      }
    }
    return { slug };
  });

export const listDirects = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<RoomRow>`
      select
        r.id, r.slug, r.name, r.description, r.kind, r.created_by, r.created_at,
        2::int as member_count,
        lm.body as last_body,
        lm.created_at as last_at,
        r.pinned_message_id,
        (
          select count(*)::int from messages msg
          where msg.room_id = r.id
            and msg.user_id <> ${context.userId}
            and (mine.last_read_at is null or msg.created_at > mine.last_read_at)
        ) as unread
      from rooms r
      join room_members mine on mine.room_id = r.id and mine.user_id = ${context.userId}
      left join lateral (
        select body, created_at from messages where room_id = r.id order by id desc limit 1
      ) lm on true
      where r.kind = 'dm'
      order by coalesce(lm.created_at, r.created_at) desc
    `;
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<NotificationRow>`
      select id, kind, title, body, href, read, created_at
      from notifications
      where user_id = ${context.userId}
      order by id desc
      limit 40
    `;
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update notifications set read = true where user_id = ${context.userId} and read = false`;
    return { ok: true as const };
  });

export const notifyPeers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { slug: string; kind: "message" | "call"; title: string; body: string }) => ({
    slug: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/).parse(input.slug),
    kind: input.kind,
    title: input.title.trim().slice(0, 80),
    body: input.body.trim().slice(0, 160),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: number }>`select id from rooms where slug = ${data.slug} limit 1`;
    const room = rooms[0];
    if (!room) return { ok: true as const };
    const others = await sql<{ user_id: string }>`
      select user_id from room_members
      where room_id = ${room.id} and user_id <> ${context.userId}
    `;
    for (const other of others) {
      const muted = await sql<{ muter_id: string }>`
        select muter_id from mutes where muter_id = ${other.user_id} and muted_id = ${context.userId} limit 1
      `;
      if (muted[0]) continue;
      await notify(sql, other.user_id, data.kind, data.title, data.body, `/r/${data.slug}`);
    }
    return { ok: true as const };
  });

export const inviteToPlay = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => z.string().min(1).max(80).parse(userId))
  .handler(async ({ context, data: otherId }) => {
    if (otherId === context.userId) throw new Error("اختر صديقاً");
    const sql = await getSql();
    const me = await sql<{ display_name: string }>`
      select display_name from profiles where user_id = ${context.userId} limit 1
    `;
    await notify(
      sql,
      otherId,
      "play",
      "دعوة للعب",
      `${me[0]?.display_name || "صديق"} يدعوك للسودوكو.`,
      "/tools",
    );
    return { ok: true as const };
  });
