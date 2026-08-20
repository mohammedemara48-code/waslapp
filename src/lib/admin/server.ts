import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { ProfileRow, RoomRow } from "@/lib/chat/types";

async function requireOwner(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ role: string }>`
    select role from profiles where user_id = ${userId} limit 1
  `;
  const role = rows[0]?.role ?? "member";
  if (role !== "owner" && role !== "admin") throw new Error("هذه الصفحة لصاحب التطبيق");
  return sql;
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ role: string }>`
      select role from profiles where user_id = ${context.userId} limit 1
    `;
    return { role: rows[0]?.role ?? "member" };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireOwner(context.userId);
    const users = await sql<{ n: number }>`select count(*)::int as n from profiles`;
    const rooms = await sql<{ n: number }>`select count(*)::int as n from rooms where kind = 'public'`;
    const messages = await sql<{ n: number }>`select count(*)::int as n from messages`;
    const stories = await sql<{ n: number }>`select count(*)::int as n from stories where created_at > now() - interval '24 hours'`;
    const online = await sql<{ n: number }>`select count(*)::int as n from profiles where last_seen > now() - interval '45 seconds'`;
    return {
      users: users[0]?.n ?? 0,
      rooms: rooms[0]?.n ?? 0,
      messages: messages[0]?.n ?? 0,
      stories: stories[0]?.n ?? 0,
      online: online[0]?.n ?? 0,
    };
  });

export const adminListMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireOwner(context.userId);
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
      role: string;
      badge: string | null;
      points: number | null;
    }>`
      select user_id, username, display_name, email, phone, bio, avatar_url, avatar_data, last_seen, role, badge, coalesce(points, 0)::int as points
      from profiles
      order by case when role = 'owner' then 0 when role = 'admin' then 1 when role = 'banned' then 3 else 2 end, display_name
    `;
    return rows.map(
      (r): ProfileRow & { role: string } => ({
        user_id: r.user_id,
        username: r.username,
        display_name: r.display_name,
        email: r.email,
        phone: r.phone,
        bio: r.bio,
        avatar_url: r.avatar_data || r.avatar_url,
        last_seen: r.last_seen,
        online: r.last_seen ? Date.now() - new Date(r.last_seen).getTime() < 45_000 : false,
        role: r.role,
        badge: r.badge,
        points: r.points,
      }),
    );
  });

export const adminListRooms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await requireOwner(context.userId);
    return sql<RoomRow>`
      select
        r.id, r.slug, r.name, r.description, r.kind, r.created_by, r.created_at,
        (select count(*)::int from room_members m where m.room_id = r.id) as member_count,
        null::text as last_body,
        null::timestamptz as last_at
      from rooms r
      where r.kind = 'public'
      order by r.created_at desc
    `;
  });

export const adminDeleteRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await requireOwner(context.userId);
    await sql`delete from messages where room_id = ${id}`;
    await sql`delete from room_members where room_id = ${id}`;
    await sql`delete from rooms where id = ${id} and kind = 'public'`;
    return { ok: true as const };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; role: "member" | "banned" | "admin" }) => ({
    userId: z.string().min(1).max(80).parse(input.userId),
    role: input.role,
  }))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("لا يمكن تغيير صلاحيتك");
    const sql = await requireOwner(context.userId);
    const target = await sql<{ role: string }>`select role from profiles where user_id = ${data.userId} limit 1`;
    if (target[0]?.role === "owner") throw new Error("لا يمكن تعديل صاحب التطبيق");
    await sql`update profiles set role = ${data.role} where user_id = ${data.userId}`;
    return { ok: true as const };
  });

export const adminBroadcast = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; body: string }) => {
    const title = input.title.trim().slice(0, 80);
    const body = input.body.trim().slice(0, 200);
    if (!title) throw new Error("أدخل عنواناً");
    return { title, body };
  })
  .handler(async ({ context, data }) => {
    const sql = await requireOwner(context.userId);
    const users = await sql<{ user_id: string }>`
      select user_id from profiles where role <> 'banned' and user_id <> ${context.userId}
    `;
    for (const u of users) {
      await sql`
        insert into notifications (user_id, kind, title, body, href)
        values (${u.user_id}, 'admin', ${data.title}, ${data.body}, '/')
      `;
    }
    return { ok: true as const, count: users.length };
  });

export const adminSetBadge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; badge: "active" | "featured" | "" }) => ({
    userId: z.string().min(1).max(80).parse(input.userId),
    badge: input.badge,
  }))
  .handler(async ({ context, data }) => {
    const sql = await requireOwner(context.userId);
    const value = data.badge || null;
    await sql`update profiles set badge = ${value} where user_id = ${data.userId}`;
    return { ok: true as const };
  });
