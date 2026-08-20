import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";
import { presignS3Upload, s3StorageOn } from "@/lib/media/storage.server";

export const Route = createFileRoute("/api/media/sign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        if (!s3StorageOn()) return Response.json({ error: "S3 غير مفعّل" }, { status: 400 });
        const body = (await request.json()) as { filename?: string; type?: string; size?: number };
        try {
          const signed = await presignS3Upload({
            filename: body.filename ?? "file",
            type: body.type ?? "application/octet-stream",
            size: Number(body.size ?? 0),
          });
          return Response.json(signed);
        } catch (err) {
          return Response.json({ error: err instanceof Error ? err.message : "sign failed" }, { status: 400 });
        }
      },
    },
  },
});
