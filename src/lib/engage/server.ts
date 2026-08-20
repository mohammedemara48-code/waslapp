import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { MessageRow } from "@/lib/chat/types";

export const getInboxCounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const dms = await sql<{ n: number }>`
      select coalesce(sum(u.n), 0)::int as n
      from (
        select (
          select count(*)::int from messages msg
          where msg.room_id = r.id
            and msg.user_id <> ${context.userId}
            and (mine.last_read_at is null or msg.created_at > mine.last_read_at)
        ) as n
        from rooms r
        join room_members mine on mine.room_id = r.id and mine.user_id = ${context.userId}
        where r.kind = 'dm'
      ) u
    `;
    const notes = await sql<{ n: number }>`
      select count(*)::int as n from notifications where user_id = ${context.userId} and read = false
    `;
    return { dms: dms[0]?.n ?? 0, notes: notes[0]?.n ?? 0 };
  });

export const markRoomRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((slug: string) => z.string().min(2).max(32).parse(slug))
  .handler(async ({ context, data: slug }) => {
    const sql = await getSql();
    await sql`
      update room_members m
      set last_read_at = now()
      from rooms r
      where r.slug = ${slug} and m.room_id = r.id and m.user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const muteUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => z.string().min(1).max(80).parse(userId))
  .handler(async ({ context, data: otherId }) => {
    if (otherId === context.userId) throw new Error("لا يمكن كتم نفسك");
    const sql = await getSql();
    const existing = await sql<{ muter_id: string }>`
      select muter_id from mutes where muter_id = ${context.userId} and muted_id = ${otherId} limit 1
    `;
    if (existing[0]) {
      await sql`delete from mutes where muter_id = ${context.userId} and muted_id = ${otherId}`;
      return { muted: false as const };
    }
    await sql`
      insert into mutes (muter_id, muted_id) values (${context.userId}, ${otherId})
      on conflict do nothing
    `;
    return { muted: true as const };
  });

export const reportUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; reason?: string }) => ({
    userId: z.string().min(1).max(80).parse(input.userId),
    reason: (input.reason ?? "بلاغ").trim().slice(0, 200),
  }))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("لا يمكن إبلاغ نفسك");
    const sql = await getSql();
    await sql`
      insert into reports (reporter_id, target_id, reason)
      values (${context.userId}, ${data.userId}, ${data.reason})
    `;
    const owners = await sql<{ user_id: string }>`
      select user_id from profiles where role in ('owner', 'admin')
    `;
    const me = await sql<{ display_name: string }>`
      select display_name from profiles where user_id = ${context.userId} limit 1
    `;
    for (const o of owners) {
      await sql`
        insert into notifications (user_id, kind, title, body, href)
        values (
          ${o.user_id},
          'report',
          'بلاغ جديد',
          ${`${me[0]?.display_name ?? "عضو"} أبلغ عن حساب`},
          ${`/u/${data.userId}`}
        )
      `;
    }
    return { ok: true as const };
  });

export const toggleSaveMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const existing = await sql<{ user_id: string }>`
      select user_id from saved_messages where user_id = ${context.userId} and message_id = ${id} limit 1
    `;
    if (existing[0]) {
      await sql`delete from saved_messages where user_id = ${context.userId} and message_id = ${id}`;
      return { saved: false as const };
    }
    await sql`
      insert into saved_messages (user_id, message_id) values (${context.userId}, ${id})
      on conflict do nothing
    `;
    return { saved: true as const };
  });

export const listSavedMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<MessageRow & { display_name: string; avatar_url: string | null; avatar_data: string | null }>`
      select
        m.id, m.room_id, m.user_id, m.body, m.created_at,
        m.attachment_name, m.attachment_type, m.attachment_data,
        coalesce(p.display_name, 'ضيف') as display_name,
        p.avatar_url, p.avatar_data
      from saved_messages s
      join messages m on m.id = s.message_id
      left join profiles p on p.user_id = m.user_id
      where s.user_id = ${context.userId}
      order by s.created_at desc
      limit 80
    `;
    return rows.map((m) => ({ ...m, avatar_url: m.avatar_data || m.avatar_url }));
  });

export const pinRoomMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { slug: string; messageId: number | null }) => ({
    slug: z.string().min(2).max(32).parse(input.slug),
    messageId: input.messageId,
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: number; created_by: string }>`
      select id, created_by from rooms where slug = ${data.slug} limit 1
    `;
    const room = rooms[0];
    if (!room) throw new Error("الغرفة غير موجودة");
    const role = await sql<{ role: string }>`select role from profiles where user_id = ${context.userId} limit 1`;
    const can = room.created_by === context.userId || role[0]?.role === "owner" || role[0]?.role === "admin";
    if (!can) throw new Error("تثبيت الرسائل لصاحب الغرفة");
    await sql`update rooms set pinned_message_id = ${data.messageId} where id = ${room.id}`;
    return { ok: true as const };
  });

export const toggleMicQueue = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((slug: string) => z.string().min(2).max(32).parse(slug))
  .handler(async ({ context, data: slug }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: number }>`select id from rooms where slug = ${slug} limit 1`;
    const room = rooms[0];
    if (!room) throw new Error("الغرفة غير موجودة");
    const existing = await sql<{ user_id: string }>`
      select user_id from mic_queue where room_id = ${room.id} and user_id = ${context.userId} limit 1
    `;
    if (existing[0]) {
      await sql`delete from mic_queue where room_id = ${room.id} and user_id = ${context.userId}`;
      return { queued: false as const };
    }
    await sql`
      insert into mic_queue (room_id, user_id) values (${room.id}, ${context.userId})
      on conflict do nothing
    `;
    return { queued: true as const };
  });

export const listMicQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((slug: string) => z.string().min(2).max(32).parse(slug))
  .handler(async ({ data: slug }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: number }>`select id from rooms where slug = ${slug} limit 1`;
    if (!rooms[0]) return [] as { user_id: string; display_name: string }[];
    return sql<{ user_id: string; display_name: string }>`
      select q.user_id, coalesce(p.display_name, 'عضو') as display_name
      from mic_queue q
      left join profiles p on p.user_id = q.user_id
      where q.room_id = ${rooms[0].id}
      order by q.requested_at
    `;
  });

export const lookupWaslNo = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((no: string) => z.string().regex(/^\d+$/).parse(no))
  .handler(async ({ data: no }) => {
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`
      select user_id from profiles where wasl_no = ${Number(no)} limit 1
    `;
    if (!rows[0]) throw new Error("لا حساب بهذا الرقم");
    return { userId: rows[0].user_id };
  });
