import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { rankFromPoints, SUDOKU_REWARD } from "@/lib/points";

export async function awardPoints(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  key: string,
  amount: number,
) {
  if (amount <= 0) return { awarded: false, points: 0 };
  const inserted = await sql<{ key: string }>`
    insert into point_events (user_id, key, amount)
    values (${userId}, ${key}, ${amount})
    on conflict (user_id, key) do nothing
    returning key
  `;
  if (!inserted[0]) {
    const cur = await sql<{ points: number }>`select coalesce(points, 0)::int as points from profiles where user_id = ${userId}`;
    return { awarded: false, points: cur[0]?.points ?? 0 };
  }
  const rows = await sql<{ points: number }>`
    update profiles set points = coalesce(points, 0) + ${amount} where user_id = ${userId}
    returning coalesce(points, 0)::int as points
  `;
  return { awarded: true, points: rows[0]?.points ?? amount };
}

export const getMyPoints = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ points: number; role: string | null }>`
      select coalesce(points, 0)::int as points, role from profiles where user_id = ${context.userId} limit 1
    `;
    const points = rows[0]?.points ?? 0;
    return { points, role: rows[0]?.role ?? null, rank: rankFromPoints(points) };
  });

export const completeSudoku = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { level: string; puzzle: number }) => ({
    level: z.enum(["easy", "medium", "hard", "expert"]).parse(input.level),
    puzzle: z.number().int().min(1).max(24).parse(input.puzzle),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const amount = SUDOKU_REWARD[data.level] ?? 15;
    const res = await awardPoints(sql, context.userId, `sudoku:${data.level}:${data.puzzle}`, amount);
    return { ...res, amount, rank: rankFromPoints(res.points) };
  });

export const completeChess = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((level: string) => z.enum(["easy", "medium", "hard"]).parse(level))
  .handler(async ({ context, data: level }) => {
    const sql = await getSql();
    const amount = level === "hard" ? 55 : level === "medium" ? 35 : 20;
    const key = `chess:${level}:${Date.now()}`;
    const res = await awardPoints(sql, context.userId, key, amount);
    return { ...res, amount, rank: rankFromPoints(res.points) };
  });

export const completeMemory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((level: string) => z.enum(["easy", "medium", "hard"]).parse(level))
  .handler(async ({ context, data: level }) => {
    const sql = await getSql();
    const amount = level === "hard" ? 22 : level === "medium" ? 14 : 8;
    const key = `memory:${level}:${Date.now()}`;
    const res = await awardPoints(sql, context.userId, key, amount);
    return { ...res, amount, rank: rankFromPoints(res.points) };
  });
