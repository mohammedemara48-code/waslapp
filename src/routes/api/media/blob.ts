import { createFileRoute } from "@tanstack/react-router";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth/verify.server";
import { REMOTE_FILE_MAX_BYTES } from "@/lib/media/limits";

export const Route = createFileRoute("/api/media/blob")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as HandleUploadBody;
        try {
          const json = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => {
              const user = await getSessionUser();
              if (!user) throw new Error("Unauthorized");
              return {
                allowedContentTypes: [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "image/gif",
                  "image/heic",
                  "video/mp4",
                  "video/webm",
                  "video/quicktime",
                  "video/3gpp",
                  "application/pdf",
                  "application/octet-stream",
                ],
                maximumSizeInBytes: REMOTE_FILE_MAX_BYTES,
                addRandomSuffix: true,
              };
            },
          });
          return Response.json(json);
        } catch (err) {
          const message = err instanceof Error ? err.message : "upload failed";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
