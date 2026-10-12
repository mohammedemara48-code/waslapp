import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { verifyReadToken } from "@/lib/push/server";

const bodySchema = z.object({
  uid: z.string().min(1).max(80),
  href: z.string().regex(/^\/r\/[a-zA-Z0-9_-]{1,40}$/),
  token: z.string().min(10).max(100),
});

async function handle({ request }: { request: Request }) {
  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (!(await verifyReadToken(parsed.uid, parsed.href, parsed.token))) {
    return new Response("forbidden", { status: 403 });
  }
  const sql = await getSql();
  await sql`
    update notifications set read = true
    where user_id = ${parsed.uid} and read = false and href = ${parsed.href}
  `;
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from notifications where user_id = ${parsed.uid} and read = false
  `;
  return Response.json({ ok: true, unread: rows[0]?.n ?? 0 });
}

export const Route = createFileRoute("/api/push/read")({
  server: { handlers: { POST: handle } },
});
