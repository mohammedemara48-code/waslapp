import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ImageIcon, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { deletePost, likePost, listPosts, publishPost } from "@/lib/feed/server";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { compressImage, cn, fileToAttachment, formatDay, initials } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { MediaVideo } from "@/components/media-video";
import { StoriesRail } from "@/components/stories-rail";
import { UserActions } from "@/components/user-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FeedPage() {
  const me = useCurrentUser();
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
            <article key={post.id} className="rounded-xl border border-border bg-surface p-4">
              <header className="mb-3 flex items-center gap-2">
                <UserActions
                  person={{
                    user_id: post.user_id,
                    display_name: post.display_name,
                    username: post.username,
                    avatar_url: post.avatar_url,
                    wasl_no: post.wasl_no,
                    online: false,
                    badge: null,
                  }}
                >
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-right">
                    <Avatar className="size-10">
                      {post.avatar_url ? <AvatarImage src={post.avatar_url} alt="" /> : null}
                      <AvatarFallback>{initials(post.display_name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{post.display_name}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {post.kind === "reel" ? "ريل · " : ""}
                        رقم {post.wasl_no ?? "—"} · {formatDay(post.created_at)}
                      </span>
                    </span>
                  </button>
                </UserActions>
                {post.user_id === me?.id ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void deletePost({ data: post.id })
                        .then(() => {
                          toast.success("حُذف المنشور");
                          void queryClient.invalidateQueries({ queryKey: ["posts"] });
                        })
                        .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الحذف"))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </header>
              {post.body ? <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p> : null}
              {post.kind === "image" && post.media_data ? (
                <img src={post.media_data} alt="" className="max-h-96 w-full rounded-lg object-cover" />
              ) : null}
              {(post.kind === "video" || post.kind === "reel") && post.media_data ? (
                <MediaVideo
                  src={post.media_data}
                  className={cn("w-full rounded-lg bg-elevated", post.kind === "reel" ? "max-h-[28rem]" : "max-h-72")}
                />
              ) : null}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant={post.liked ? "default" : "secondary"}
                  onClick={() =>
                    void likePost({ data: post.id }).then(() => queryClient.invalidateQueries({ queryKey: ["posts"] }))
                  }
                >
                  <Heart className="size-4" />
                  {post.likes}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
