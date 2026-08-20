import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import { listPosts, publishPost } from "@/lib/feed/server";
import { listOnline } from "@/lib/live/server";
import { listRooms } from "@/lib/chat/server";
import { compressImage, cn, fileToAttachment } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { MediaVideo } from "@/components/media-video";
import { PostCard } from "@/components/post-card";
import { StoriesRail } from "@/components/stories-rail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

export function FeedPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const feed = useQuery({ queryKey: ["posts"], queryFn: () => listPosts(), refetchInterval: 12000 });
  const online = useQuery({ queryKey: ["online"], queryFn: () => listOnline(), refetchInterval: 15000 });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => listRooms(), refetchInterval: 20000 });
  const [kind, setKind] = useState<"text" | "image" | "video" | "reel">("text");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<string | null>(null);
  const [audience, setAudience] = useState<"all" | "friends">("all");
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.type.startsWith("image/")) {
        setMedia(await compressImage(file, 1080, 0.82));
        setKind("image");
      } else {
        toast.message("جارٍ رفع الفيديو…");
        const att = await fileToAttachment(file);
        setMedia(att.data);
        if (kind !== "reel") setKind("video");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر الرفع");
    }
  }

  async function publish() {
    setBusy(true);
    try {
      await publishPost({ data: { kind, body, mediaData: media, visibility: audience } });
      toast.success(kind === "reel" ? "نُشر الريل" : "نُشر المنشور");
      setBody("");
      setMedia(null);
      setKind("text");
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر النشر");
    } finally {
      setBusy(false);
    }
  }

  const posts = feed.data ?? [];

  return (
    <AppShell active="feed">
      <div className="mx-auto w-full max-w-xl space-y-6 px-5 py-8">
        <StoriesRail />
        <div>
          <p className="text-sm text-accent">{t.feed_kicker}</p>
          <h1 className="mt-1 font-display text-3xl">{t.feed_title}</h1>
        </div>
        {(online.data?.length ?? 0) > 0 ? (
          <div className="flex gap-2 overflow-x-auto text-xs">
            {(online.data ?? []).slice(0, 8).map((p) => (
              <Link
                key={p.user_id}
                to="/u/$userId"
                params={{ userId: p.user_id }}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-muted"
              >
                {p.display_name} · {t.connected}
              </Link>
            ))}
          </div>
        ) : null}
        {(rooms.data?.length ?? 0) > 0 ? (
          <div className="flex gap-2 overflow-x-auto text-xs">
            {(rooms.data ?? []).slice(0, 6).map((r) => (
              <Link key={r.slug} to="/r/$slug" params={{ slug: r.slug }} className="shrink-0 rounded-full bg-elevated px-3 py-1.5 text-muted">
                #{r.name}
              </Link>
            ))}
            <Link to="/tools" className="shrink-0 rounded-full border border-accent/40 px-3 py-1.5 text-accent">
              {t.games_tv}
            </Link>
          </div>
        ) : null}

        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["text", t.text],
                ["image", t.image],
                ["video", t.video],
                ["reel", t.reel],
              ] as const
            ).map(([id, label]) => (
              <Button key={id} size="sm" variant={kind === id ? "default" : "secondary"} onClick={() => setKind(id)}>
                {label}
              </Button>
            ))}
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={kind === "reel" ? t.reel_ph : t.share_ph}
          />
          {kind !== "text" ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted">
              {kind === "image" ? <ImageIcon className="size-4" /> : <Video className="size-4" />}
              {media ? t.file_picked : t.pick_file}
              <input
                type="file"
                accept={kind === "image" ? "image/*" : "video/*"}
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          ) : null}
          {media && kind === "image" ? <img src={media} alt="" className="max-h-48 rounded-lg object-cover" /> : null}
          {media && kind !== "image" && kind !== "text" ? (
            <MediaVideo src={media} className={cn("w-full rounded-lg bg-elevated", kind === "reel" ? "max-h-96" : "max-h-56")} />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={audience === "all" ? "default" : "secondary"} onClick={() => setAudience("all")}>
              {t.all_members}
            </Button>
            <Button size="sm" variant={audience === "friends" ? "default" : "secondary"} onClick={() => setAudience("friends")}>
              {t.friends_only}
            </Button>
            <Button className="ms-auto" disabled={busy} onClick={() => void publish()}>
              {busy ? t.saving : t.publish}
            </Button>
          </div>
        </section>

        {posts.length === 0 && !feed.isPending ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-display text-2xl">الخط فارغ</p>
            <p className="mt-2 text-sm text-muted">كن أول من ينشر منشوراً أو ريلاً يراه الأعضاء.</p>
          </div>
        ) : null}

        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
