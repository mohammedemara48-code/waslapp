import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import { listPosts, publishPost } from "@/lib/feed/server";
import { compressImage, cn, fileToAttachment } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { MediaVideo } from "@/components/media-video";
import { PostCard } from "@/components/post-card";
import { StoriesRail } from "@/components/stories-rail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FeedPage() {
  const queryClient = useQueryClient();
  const feed = useQuery({ queryKey: ["posts"], queryFn: () => listPosts(), refetchInterval: 12000 });
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
        toast.message("جارٍ تجهيز الفيديو…");
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
          <p className="text-sm text-accent">منشورات وريلز الأعضاء</p>
          <h1 className="mt-1 font-display text-3xl">الخط الزمني</h1>
        </div>

        <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["text", "نص"],
                ["image", "صورة"],
                ["video", "فيديو"],
                ["reel", "ريل"],
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
            placeholder={kind === "reel" ? "وصف الريل…" : "ماذا تريد أن تشارك؟"}
          />
          {kind !== "text" ? (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted">
              {kind === "image" ? <ImageIcon className="size-4" /> : <Video className="size-4" />}
              {media ? "تم اختيار الملف — اضغط لتغييره" : "اختر صورة أو فيديو"}
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
              كل الأعضاء
            </Button>
            <Button size="sm" variant={audience === "friends" ? "default" : "secondary"} onClick={() => setAudience("friends")}>
              الأصدقاء
            </Button>
            <Button className="ms-auto" disabled={busy} onClick={() => void publish()}>
              {busy ? "جارٍ النشر…" : "نشر"}
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
