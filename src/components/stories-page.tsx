import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { likeStory, listStories, publishStory, viewStory } from "@/lib/live/server";
import { compressImage, cn, fileToAttachment, initials } from "@/lib/utils";
import {
  STORY_FILTERS,
  STORY_TRACKS,
  filterClass,
  packStoryStyle,
  parseStoryStyle,
  playStoryMusic,
  stopStoryMusic,
} from "@/lib/story-style";
import { AppShell } from "@/components/app-shell";
import { MediaVideo } from "@/components/media-video";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StoryRow } from "@/lib/chat/types";

const TINTS = [
  { id: "ink", label: "حبر" },
  { id: "sand", label: "رمل" },
  { id: "moss", label: "طحلب" },
  { id: "night", label: "ليل" },
] as const;

function tintClass(tint: string) {
  if (tint === "sand") return "bg-accent text-accent-fg";
  if (tint === "moss") return "bg-ok text-accent-fg";
  if (tint === "night") return "bg-elevated text-fg";
  return "bg-bg text-fg";
}

export function StoriesPage() {
  const queryClient = useQueryClient();
  const feed = useQuery({ queryKey: ["stories"], queryFn: () => listStories(), refetchInterval: 10000 });
  const [compose, setCompose] = useState(false);
  const [kind, setKind] = useState<"text" | "image" | "video">("text");
  const [body, setBody] = useState("");
  const [tint, setTint] = useState("ink");
  const [fx, setFx] = useState("none");
  const [track, setTrack] = useState("off");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activePack, setActivePack] = useState<StoryRow[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = activePack[activeIdx] ?? null;

  const items = feed.data ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, StoryRow[]>();
    for (const s of items) {
      const list = map.get(s.user_id) ?? [];
      list.push(s);
      map.set(s.user_id, list);
    }
    return [...map.values()];
  }, [items]);

  useEffect(() => {
    if (!active || active.kind === "video") return;
    const t = window.setTimeout(() => goStory(1), 6500);
    return () => window.clearTimeout(t);
  }, [active?.id, activeIdx]);

  async function publish() {
    setBusy(true);
    try {
      await publishStory({
        data: { kind, body, imageData: image, tint: packStoryStyle(tint, fx, track) },
      });
      toast.success("نُشرت القصة");
      setCompose(false);
      setBody("");
      setImage(null);
      void queryClient.invalidateQueries({ queryKey: ["stories"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر النشر");
    } finally {
      setBusy(false);
    }
  }

  async function openStory(pack: StoryRow[], index = 0) {
    setActivePack(pack);
    setActiveIdx(index);
    const story = pack[index];
    if (story) await viewStory({ data: story.id }).catch(() => {});
    void queryClient.invalidateQueries({ queryKey: ["stories"] });
  }

  function goStory(delta: number) {
    const next = activeIdx + delta;
    if (next < 0 || next >= activePack.length) {
      setActivePack([]);
      setActiveIdx(0);
      stopStoryMusic();
      return;
    }
    setActiveIdx(next);
    const story = activePack[next];
    if (story) void viewStory({ data: story.id }).catch(() => {});
  }

  const packed = active ? parseStoryStyle(active.tint) : null;

  return (
    <AppShell active="stories">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-accent">صورة أو فيديو أو نص، مع فلتر وموسيقى</p>
            <h1 className="mt-1 font-display text-3xl">القصص</h1>
          </div>
          <Button onClick={() => setCompose(true)}>
            <Plus className="size-4" />
            أضف قصة
          </Button>
        </div>

        {grouped.length === 0 && !feed.isPending ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-display text-2xl">لا قصص بعد</p>
            <p className="mt-2 text-sm text-muted">انشر سطراً أو صورة أو مقطعاً حتى 30 ثانية يراه أصدقاؤك اليوم فقط.</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {grouped.map((pack) => {
            const first = pack[0]!;
            return (
              <button
                key={first.user_id}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-right"
                onClick={() => void openStory(pack, 0)}
              >
                <span className="rounded-full bg-accent p-px">
                  <Avatar className="size-12 border-2 border-surface">
                    {first.avatar_url ? <AvatarImage src={first.avatar_url} alt="" /> : null}
                    <AvatarFallback>{initials(first.display_name)}</AvatarFallback>
                  </Avatar>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{first.display_name}</span>
                  <span className="text-xs text-muted">{pack.length} قصة</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={compose} onOpenChange={setCompose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قصة جديدة</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {(["text", "image", "video"] as const).map((k) => (
              <Button key={k} variant={kind === k ? "default" : "secondary"} size="sm" onClick={() => setKind(k)}>
                {k === "text" ? "نص" : k === "image" ? "صورة" : "فيديو"}
              </Button>
            ))}
          </div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={140} rows={3} placeholder="تعليق أو سطر…" />
          {kind === "text" ? (
            <div className="flex flex-wrap gap-2">
              {TINTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn("h-8 rounded-full px-3 text-xs", tintClass(t.id), tint === t.id ? "ring-2 ring-ring" : "")}
                  onClick={() => setTint(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <Input
              type="file"
              accept={kind === "video" ? "video/*" : "image/*"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (kind === "video") {
                  toast.message("جارٍ تجهيز المقطع… حتى 30 ثانية");
                  void fileToAttachment(file).then((a) => setImage(a.data)).catch((err) => toast.error(err.message));
                } else {
                  void compressImage(file, 720, 0.8).then(setImage).catch((err) => toast.error(err.message));
                }
              }}
            />
          )}
          <p className="text-xs text-subtle">فلتر</p>
          <div className="flex flex-wrap gap-1">
            {STORY_FILTERS.map((f) => (
              <Button key={f.id} size="sm" variant={fx === f.id ? "default" : "secondary"} onClick={() => setFx(f.id)}>
                {f.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-subtle">موسيقى</p>
          <div className="flex flex-wrap gap-1">
            {STORY_TRACKS.map((tr) => (
              <Button key={tr.id} size="sm" variant={track === tr.id ? "default" : "secondary"} onClick={() => setTrack(tr.id)}>
                {tr.label}
              </Button>
            ))}
          </div>
          <Button onClick={() => void publish()} disabled={busy}>
            {busy ? "جارٍ النشر…" : "نشر"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) {
            setActivePack([]);
            setActiveIdx(0);
            stopStoryMusic();
          }
        }}
      >
        <DialogContent className="overflow-hidden p-0">
          {active && packed ? (
            <div className={cn("relative flex min-h-80 flex-col justify-between p-6", tintClass(packed.bg))}>
              {activePack.length > 1 ? (
                <div className="mb-3 flex gap-1">
                  {activePack.map((s, i) => (
                    <span
                      key={s.id}
                      className={cn("h-1 flex-1 rounded-full", i <= activeIdx ? "bg-accent" : "bg-fg/20")}
                    />
                  ))}
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  {active.avatar_url ? <AvatarImage src={active.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initials(active.display_name)}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm">{active.display_name}</p>
                <p className="text-xs opacity-70">
                  {activeIdx + 1}/{activePack.length}
                </p>
              </div>
              {active.kind === "video" && active.image_data ? (
                <MediaVideo
                  key={active.id}
                  src={active.image_data}
                  className={cn("mx-auto max-h-72 w-full rounded-lg bg-black", filterClass(packed.filter))}
                  onEnded={() => goStory(1)}
                />
              ) : active.image_data ? (
                <img src={active.image_data} alt="" className={cn("mx-auto max-h-72 rounded-lg object-cover", filterClass(packed.filter))} />
              ) : (
                <p className={cn("font-display text-3xl leading-snug", filterClass(packed.filter))}>{active.body}</p>
              )}
              {active.body && active.kind !== "text" ? <p className="text-sm">{active.body}</p> : null}
              <div className="mt-3 flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={activeIdx === 0}
                  onClick={() => goStory(-1)}
                >
                  <ChevronRight className="size-4" />
                  السابق
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void likeStory({ data: active.id }).then(() => queryClient.invalidateQueries({ queryKey: ["stories"] }))
                  }
                >
                  <Heart className="size-4" />
                  {active.likes}
                </Button>
                <span className="flex items-center gap-1 text-xs opacity-80">
                  <Eye className="size-3.5" />
                  {active.views}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="ms-auto"
                  onClick={() => goStory(1)}
                >
                  التالي
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
