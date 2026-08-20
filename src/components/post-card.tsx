import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addPostComment, deletePost, deletePostComment, likePost, listPostComments } from "@/lib/feed/server";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn, formatClock, formatDay, initials } from "@/lib/utils";
import { MediaVideo } from "@/components/media-video";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PostRow } from "@/lib/chat/types";

export function PostCard({ post }: { post: PostRow }) {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const comments = useQuery({
    queryKey: ["post-comments", post.id],
    queryFn: () => listPostComments({ data: post.id }),
    enabled: open,
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addPostComment({ data: { postId: post.id, body: text } });
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["post-comments", post.id] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر التعليق");
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <header className="mb-3 flex items-center gap-2">
        <Link to="/u/$userId" params={{ userId: post.user_id }} className="flex min-w-0 flex-1 items-center gap-2">
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
        </Link>
        {post.user_id === me?.id ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void deletePost({ data: post.id })
                .then(() => {
                  toast.success("حُذف المنشور");
                  void queryClient.invalidateQueries({ queryKey: ["posts"] });
                  void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
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
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant={post.liked ? "default" : "secondary"}
          onClick={() =>
            void likePost({ data: post.id }).then(() => {
              void queryClient.invalidateQueries({ queryKey: ["posts"] });
              void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
            })
          }
        >
          <Heart className="size-4" />
          {post.likes}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
          <MessageCircle className="size-4" />
          {post.comments ?? 0}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {(comments.data ?? []).map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar className="size-7">
                {c.avatar_url ? <AvatarImage src={c.avatar_url} alt="" /> : null}
                <AvatarFallback>{initials(c.display_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-lg bg-elevated px-3 py-2">
                <p className="text-xs text-muted">
                  {c.display_name} · {formatClock(c.created_at)}
                </p>
                <p className="text-sm">{c.body}</p>
              </div>
              {c.user_id === me?.id ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void deletePostComment({ data: c.id }).then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["post-comments", post.id] });
                      void queryClient.invalidateQueries({ queryKey: ["posts"] });
                      void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => void send(e)}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب تعليقاً…" maxLength={280} />
            <Button type="submit" size="sm" disabled={!text.trim()}>
              إرسال
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
