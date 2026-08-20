import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStoredMedia } from "@/lib/media/limits";
import { awardPoints } from "@/lib/points/server";
import { notifyUser } from "@/lib/push/server";
import type { PostCommentRow, PostRow } from "@/lib/chat/types";

function displayAvatar(row: { avatar_data?: string | null; avatar_url?: string | null }): string | null {
  return row.avatar_data || row.avatar_url || null;
}

function mapPost(r: {
  id: number;
  user_id: string;
  kind: string;
  body: string;
  media_data: string | null;
  visibility: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  avatar_data: string | null;
  username: string | null;
  wasl_no: number | null;
  likes: number;
  liked: number;
  comments: number;
}): PostRow {
  return {
    id: r.id,
    user_id: r.user_id,
    kind: r.kind,
    body: r.body,
    media_data: r.media_data,
    visibility: r.visibility,
    created_at: r.created_at,
    display_name: r.display_name,
    avatar_url: displayAvatar(r),
    username: r.username,
    wasl_no: r.wasl_no,
    likes: r.likes,
    liked: r.liked > 0,
    comments: r.comments,
  };
}

export const listPosts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      user_id: string;
      kind: string;
      body: string;
      media_data: string | null;
      visibility: string;
      created_at: string;
      display_name: string;
      avatar_url: string | null;
      avatar_data: string | null;
      username: string | null;
      wasl_no: number | null;
      likes: number;
      liked: number;
      comments: number;
    }>`
      select
        p.id, p.user_id, p.kind, p.body, p.media_data, p.visibility, p.created_at,
        pr.display_name, pr.avatar_url, pr.avatar_data, pr.username, pr.wasl_no,
        (select count(*)::int from post_likes l where l.post_id = p.id) as likes,
        (select count(*)::int from post_likes l where l.post_id = p.id and l.user_id = ${context.userId}) as liked,
        (select count(*)::int from post_comments c where c.post_id = p.id) as comments
      from posts p
      join profiles pr on pr.user_id = p.user_id
      where not exists (
        select 1 from blocks b
        where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
      )
      and (
        p.user_id = ${context.userId}
        or p.visibility = 'all'
        or (
          p.visibility = 'friends'
          and exists (
            select 1 from friendships f
            where f.status = 'accepted'
              and (
                (f.requester_id = ${context.userId} and f.addressee_id = p.user_id)
                or (f.requester_id = p.user_id and f.addressee_id = ${context.userId})
              )
          )
        )
      )
      order by p.created_at desc
      limit 80
    `;
    return rows.map(mapPost);
  });

export const listUserPosts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((userId: string) => z.string().min(1).max(80).parse(userId))
  .handler(async ({ context, data: userId }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      user_id: string;
      kind: string;
      body: string;
      media_data: string | null;
      visibility: string;
      created_at: string;
      display_name: string;
      avatar_url: string | null;
      avatar_data: string | null;
      username: string | null;
      wasl_no: number | null;
      likes: number;
      liked: number;
      comments: number;
    }>`
      select
        p.id, p.user_id, p.kind, p.body, p.media_data, p.visibility, p.created_at,
        pr.display_name, pr.avatar_url, pr.avatar_data, pr.username, pr.wasl_no,
        (select count(*)::int from post_likes l where l.post_id = p.id) as likes,
        (select count(*)::int from post_likes l where l.post_id = p.id and l.user_id = ${context.userId}) as liked,
        (select count(*)::int from post_comments c where c.post_id = p.id) as comments
      from posts p
      join profiles pr on pr.user_id = p.user_id
      where p.user_id = ${userId}
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
        )
        and (
          p.user_id = ${context.userId}
          or p.visibility = 'all'
          or (
            p.visibility = 'friends'
            and exists (
              select 1 from friendships f
              where f.status = 'accepted'
                and (
                  (f.requester_id = ${context.userId} and f.addressee_id = p.user_id)
                  or (f.requester_id = p.user_id and f.addressee_id = ${context.userId})
                )
            )
          )
        )
      order by p.created_at desc
      limit 80
    `;
    return rows.map(mapPost);
  });

export const publishPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    kind: "text" | "image" | "video" | "reel";
    body?: string;
    mediaData?: string | null;
    visibility?: "all" | "friends";
  }) => {
    const kind = input.kind;
    const body = (input.body ?? "").trim().slice(0, 500);
    const mediaData = assertStoredMedia(input.mediaData ?? null);
    const visibility = input.visibility === "friends" ? "friends" : "all";
    if (kind === "text" && !body) throw new Error("اكتب شيئاً");
    if (kind !== "text" && !mediaData) throw new Error("أضف صورة أو فيديو");
    return { kind, body, mediaData, visibility };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const inserted = await sql<{ id: number }>`
      insert into posts (user_id, kind, body, media_data, visibility)
      values (${context.userId}, ${data.kind}, ${data.body}, ${data.mediaData}, ${data.visibility})
      returning id
    `;
    await awardPoints(sql, context.userId, `post:${inserted[0]?.id ?? 0}`, 8);
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
      await notifyUser(
        sql,
        f.user_id,
        "post",
        `منشور جديد من ${me[0]?.display_name ?? "صديقك"}`,
        data.kind === "reel" ? "ريل جديد على الخط الزمني" : "شاهد المنشور",
        "/",
      );
    }
    return { ok: true as const };
  });

export const likePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const existing = await sql<{ user_id: string }>`
      select user_id from post_likes where post_id = ${id} and user_id = ${context.userId} limit 1
    `;
    if (existing[0]) {
      await sql`delete from post_likes where post_id = ${id} and user_id = ${context.userId}`;
    } else {
      await sql`insert into post_likes (post_id, user_id) values (${id}, ${context.userId})`;
      await awardPoints(sql, context.userId, `like:${id}`, 1);
      const owner = await sql<{ user_id: string }>`select user_id from posts where id = ${id} limit 1`;
      if (owner[0] && owner[0].user_id !== context.userId) {
        await awardPoints(sql, owner[0].user_id, `liked:${id}:${context.userId}`, 2);
      }
    }
    return { ok: true as const };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      delete from posts where id = ${id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("لا يمكن حذف هذا المنشور");
    return { ok: true as const };
  });

export const listPostComments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((postId: number) => z.number().int().positive().parse(postId))
  .handler(async ({ data: postId }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      post_id: number;
      user_id: string;
      body: string;
      created_at: string;
      display_name: string;
      avatar_url: string | null;
      avatar_data: string | null;
    }>`
      select
        c.id, c.post_id, c.user_id, c.body, c.created_at,
        pr.display_name, pr.avatar_url, pr.avatar_data
      from post_comments c
      join profiles pr on pr.user_id = c.user_id
      where c.post_id = ${postId}
      order by c.id
      limit 80
    `;
    return rows.map(
      (r): PostCommentRow => ({
        id: r.id,
        post_id: r.post_id,
        user_id: r.user_id,
        body: r.body,
        created_at: r.created_at,
        display_name: r.display_name,
        avatar_url: displayAvatar(r),
      }),
    );
  });

export const addPostComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { postId: number; body: string }) => {
    const postId = z.number().int().positive().parse(input.postId);
    const body = input.body.trim().slice(0, 280);
    if (body.length < 1) throw new Error("اكتب تعليقاً");
    return { postId, body };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const inserted = await sql<{ id: number }>`
      insert into post_comments (post_id, user_id, body)
      values (${data.postId}, ${context.userId}, ${data.body})
      returning id
    `;
    await awardPoints(sql, context.userId, `comment:${inserted[0]?.id ?? 0}`, 3);
    const post = await sql<{ user_id: string }>`select user_id from posts where id = ${data.postId} limit 1`;
    if (post[0] && post[0].user_id !== context.userId) {
      const me = await sql<{ display_name: string }>`
        select display_name from profiles where user_id = ${context.userId} limit 1
      `;
      await notifyUser(
        sql,
        post[0].user_id,
        "comment",
        `${me[0]?.display_name ?? "عضو"} علّق على منشورك`,
        data.body,
        "/",
      );
    }
    return { ok: true as const };
  });

export const deletePostComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => z.number().int().positive().parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      delete from post_comments where id = ${id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("لا يمكن حذف التعليق");
    return { ok: true as const };
  });

