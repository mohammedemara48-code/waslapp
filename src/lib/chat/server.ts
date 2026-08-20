import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { notifyUser } from "@/lib/push/server";
import { assertStoredMedia } from "@/lib/media/limits";
import type { MessageRow, ProfileRow, RoomDetail, RoomRow } from "./types";

const slugSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

function avatarOf(row: { avatar_data?: string | null; avatar_url?: string | null }): string | null {
  return row.avatar_data || row.avatar_url || null;
}

export const listRooms = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<RoomRow>`
      select
        r.id,
        r.slug,
        r.name,
        r.description,
        r.kind,
        r.created_by,
        r.created_at,
        (select count(*)::int from room_members m where m.room_id = r.id) as member_count,
        lm.body as last_body,
        lm.created_at as last_at,
        r.pinned_message_id,
        0::int as unread
      from rooms r
      left join lateral (
        select body, created_at
        from messages
        where room_id = r.id
        order by id desc
        limit 1
      ) lm on true
      where r.kind = 'public'
      order by coalesce(lm.created_at, r.created_at) desc
    `;
  });

export const getRoom = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(async ({ context, data: slug }): Promise<RoomDetail> => {
    const sql = await getSql();
    const rooms = await sql<RoomRow>`
      select
        r.id,
        r.slug,
        r.name,
        r.description,
        r.kind,
        r.created_by,
        r.created_at,
        (select count(*)::int from room_members m where m.room_id = r.id) as member_count,
        null::text as last_body,
        null::timestamptz as last_at,
        r.pinned_message_id,
        0::int as unread
      from rooms r
      where r.slug = ${slug}
      limit 1
    `;
    const room = rooms[0];
    if (!room) throw new Error("الغرفة غير موجودة");
    if (room.kind === "dm") {
      const mine = await sql<{ user_id: string }>`
        select user_id from room_members where room_id = ${room.id} and user_id = ${context.userId} limit 1
      `;
      if (!mine[0]) throw new Error("هذه محادثة خاصة");
    }
    const members = await sql<{
      user_id: string;
      username: string | null;
      display_name: string;
      email: string | null;
      phone: string | null;
      bio: string | null;
      avatar_url: string | null;
      avatar_data: string | null;
    }>`
      select p.user_id, p.username, p.display_name, p.email, p.phone, p.bio, p.avatar_url, p.avatar_data
      from room_members m
      join profiles p on p.user_id = m.user_id
      where m.room_id = ${room.id}
      order by m.joined_at asc
    `;
    let pinned: RoomDetail["pinned"] = null;
    if (room.pinned_message_id) {
      const pin = await sql<{ id: number; body: string; display_name: string }>`
        select m.id, m.body, coalesce(p.display_name, 'عضو') as display_name
        from messages m
        left join profiles p on p.user_id = m.user_id
        where m.id = ${room.pinned_message_id} and m.room_id = ${room.id}
        limit 1
      `;
      pinned = pin[0] ?? null;
    }
    return {
      room,
      members: members.map((p) => ({
        user_id: p.user_id,
        username: p.username,
        display_name: p.display_name,
        email: p.email,
        phone: p.phone,
        bio: p.bio,
        avatar_url: avatarOf(p),
      })),
      pinned,
    };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((slug: string) => slugSchema.parse(slug))
  .handler(async ({ context, data: slug }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: number; kind: string }>`
      select id, kind from rooms where slug = ${slug} limit 1
    `;
    const room = rooms[0];
    if (!room) throw new Error("الغرفة غير موجودة");
    if (room.kind === "dm") {
      const mine = await sql<{ user_id: string }>`
        select user_id from room_members where room_id = ${room.id} and user_id = ${context.userId} limit 1
      `;
      if (!mine[0]) throw new Error("هذه محادثة خاصة");
      return { ok: true as const, roomId: room.id };
    }
    await sql`
      insert into room_members (room_id, user_id)
      values (${room.id}, ${context.userId})
      on conflict (room_id, user_id) do nothing
    `;
    return { ok: true as const, roomId: room.id };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { slug: string; afterId?: number }) => {
    const slug = slugSchema.parse(input.slug);
    const afterId = input.afterId ?? 0;
    return { slug, afterId };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rooms = await sql<{ id: number; kind: string }>`
      select id, kind from rooms where slug = ${data.slug} limit 1
    `;
    const room = rooms[0];
    if (!room) return [] as MessageRow[];
    if (room.kind === "dm") {
      const mine = await sql<{ user_id: string }>`
        select user_id from room_members where room_id = ${room.id} and user_id = ${context.userId} limit 1
      `;
      if (!mine[0]) return [] as MessageRow[];
    }
    const rows = await sql<{
      id: number;
      room_id: number;
      user_id: string;
      body: string;
      created_at: string;
      display_name: string;
      avatar_url: string | null;
      avatar_data: string | null;
      attachment_name: string | null;
      attachment_type: string | null;
      attachment_data: string | null;
    }>`
      select
        m.id,
        m.room_id,
        m.user_id,
        m.body,
        m.created_at,
        coalesce(p.display_name, 'ضيف') as display_name,
        p.avatar_url,
        p.avatar_data,
        m.attachment_name,
        m.attachment_type,
        m.attachment_data
      from messages m
      left join profiles p on p.user_id = m.user_id
      where m.room_id = ${room.id} and m.id > ${data.afterId}
      order by m.id asc
      limit 200
    `;
    return rows.map((m) => ({
      ...m,
      avatar_url: avatarOf(m),
    })) satisfies MessageRow[];
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    slug: string;
    body?: string;
    viewOnce?: boolean;
    attachment?: { name: string; type: string; data: string } | null;
  }) => {
    const slug = slugSchema.parse(input.slug);
    const body = (input.body ?? "").trim();
    let attachment = input.attachment ?? null;
    if (!body && !attachment) throw new Error("الرسالة فارغة");
    if (body.length > 2000) throw new Error("الرسالة طويلة جداً");
    if (attachment) {
      if (!attachment.name || attachment.name.length > 120) throw new Error("اسم الملف غير صالح");
      if (attachment.type !== "call-event") {
        const data = assertStoredMedia(attachment.data, "المرفق");
        if (!data) throw new Error("المرفق فارغ");
        attachment = { ...attachment, data };
      }
      if (input.viewOnce && !attachment.type.startsWith("once:") && attachment.type !== "call-event") {
        attachment = { ...attachment, type: `once:${attachment.type}` };
      }
    }
    return { slug, body, attachment };
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
    } else {
      await sql`
        insert into room_members (room_id, user_id)
        values (${room.id}, ${context.userId})
        on conflict (room_id, user_id) do nothing
      `;
    }
    const rows = await sql<{
      id: number;
      room_id: number;
      user_id: string;
      body: string;
      created_at: string;
      attachment_name: string | null;
      attachment_type: string | null;
      attachment_data: string | null;
    }>`
      insert into messages (room_id, user_id, body, attachment_name, attachment_type, attachment_data)
      values (
        ${room.id},
        ${context.userId},
        ${data.body},
        ${data.attachment?.name ?? null},
        ${data.attachment?.type ?? null},
        ${data.attachment?.data ?? null}
      )
      returning id, room_id, user_id, body, created_at, attachment_name, attachment_type, attachment_data
    `;
    const saved = rows[0];
    if (!saved) throw new Error("تعذر حفظ الرسالة");
    const profiles = await sql<{
      display_name: string;
      avatar_url: string | null;
      avatar_data: string | null;
    }>`
      select display_name, avatar_url, avatar_data
      from profiles where user_id = ${context.userId} limit 1
    `;
    const profile = profiles[0];
    if (room.kind === "dm") {
      const others = await sql<{ user_id: string }>`
        select user_id from room_members where room_id = ${room.id} and user_id <> ${context.userId}
      `;
      const preview = data.body || (data.attachment ? "مرفق جديد" : "رسالة");
      for (const other of others) {
        const muted = await sql<{ muter_id: string }>`
          select muter_id from mutes where muter_id = ${other.user_id} and muted_id = ${context.userId} limit 1
        `;
        if (muted[0]) continue;
        await notifyUser(
          sql,
          other.user_id,
          "message",
          profile?.display_name ?? "رسالة خاصة",
          preview.slice(0, 140),
          `/r/${data.slug}`,
        );
      }
    }
    return {
      id: saved.id,
      room_id: saved.room_id,
      user_id: saved.user_id,
      body: saved.body,
      created_at: saved.created_at,
      display_name: profile?.display_name ?? "ضيف",
      avatar_url: avatarOf(profile ?? {}),
      attachment_name: saved.attachment_name,
      attachment_type: saved.attachment_type,
      attachment_data: saved.attachment_data,
    } satisfies MessageRow;
  });

export const sendCallEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { slug: string; kind: "audio" | "video"; status: "missed" | "no-answer" | "rejected" | "ended" }) => ({
    slug: slugSchema.parse(input.slug),
    kind: input.kind,
    status: input.status,
  }))
  .handler(async ({ context, data }) => {
    const saved = await sendMessage({
      data: {
        slug: data.slug,
        body: "",
        attachment: { name: data.kind, type: "call-event", data: data.status },
      },
    });
    return saved;
  });

export const consumeViewOnce = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number; room_id: number }>`
      select m.id, m.room_id
      from messages m
      join room_members rm on rm.room_id = m.room_id and rm.user_id = ${context.userId}
      where m.id = ${id} and m.attachment_type like 'once:%'
      limit 1
    `;
    if (!rows[0]) throw new Error("المرفق غير موجود");
    await sql`
      update messages
      set attachment_data = '', body = case when body = '' then 'مرفق لمرة واحدة' else body end
      where id = ${id} and attachment_type like 'once:%'
    `;
    return { ok: true as const };
  });

export const createRoom = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; description?: string; slug: string }) => {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 40) throw new Error("اسم الغرفة غير صالح");
    const description = (input.description ?? "").trim().slice(0, 160);
    const slug = slugSchema.parse(input.slug);
    return { name, description, slug };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql<{ id: number }>`select id from rooms where slug = ${data.slug} limit 1`;
    if (existing[0]) throw new Error("المعرّف مستخدم");
    const rows = await sql<RoomRow>`
      insert into rooms (slug, name, description, kind, created_by)
      values (${data.slug}, ${data.name}, ${data.description}, 'public', ${context.userId})
      returning id, slug, name, description, kind, created_by, created_at,
        1::int as member_count, null::text as last_body, null::timestamptz as last_at
    `;
    const room = rows[0];
    if (!room) throw new Error("تعذر إنشاء الغرفة");
    await sql`
      insert into room_members (room_id, user_id)
      values (${room.id}, ${context.userId})
    `;
    return room;
  });
