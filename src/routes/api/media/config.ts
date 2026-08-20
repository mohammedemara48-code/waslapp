import { createFileRoute } from "@tanstack/react-router";
import { remoteStorageKind } from "@/lib/media/storage.server";
import { INLINE_MEDIA_MAX, REMOTE_FILE_MAX_BYTES, REMOTE_VIDEO_MAX_SECONDS } from "@/lib/media/limits";

export const Route = createFileRoute("/api/media/config")({
  server: {
    handlers: {
      GET: async () => {
        const storage = remoteStorageKind();
        return Response.json({
          storage,
          maxBytes: storage === "none" ? INLINE_MEDIA_MAX : REMOTE_FILE_MAX_BYTES,
          maxSeconds: storage === "none" ? 30 : REMOTE_VIDEO_MAX_SECONDS,
        });
      },
    },
  },
});
