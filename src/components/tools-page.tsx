import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listFriends, inviteToPlay } from "@/lib/social/server";
import { getMyPoints } from "@/lib/points/server";
import { RANK_POINTS, rankLabel } from "@/lib/points";
import { NEWS_TV, RADIO_STATIONS } from "@/lib/broadcast";
import { useRadio } from "@/lib/radio";
import { AppShell } from "@/components/app-shell";
import { NameBadge } from "@/components/name-badge";
import { SudokuGame } from "@/components/sudoku-game";
import { ChessGame } from "@/components/chess-game";
import { MemoryGame } from "@/components/memory-game";
import { Button } from "@/components/ui/button";

export function ToolsPage() {
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const stats = useQuery({ queryKey: ["my-points"], queryFn: () => getMyPoints() });
  const radio = useRadio();
  const [tab, setTab] = useState<"games" | "tv" | "radio">("games");
  const [tv, setTv] = useState(NEWS_TV[0]!.channel);
  const points = stats.data?.points ?? 0;

  return (
    <AppShell active="tools">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
        <div>
          <p className="text-sm text-accent">استراحة بين المحادثات</p>
          <h1 className="mt-1 font-display text-3xl">الألعاب والتلفاز</h1>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">رصيدك</p>
          <p className="font-display text-3xl">{points} نقطة</p>
          <p className="mt-1 text-sm">
            شارتك: <NameBadge role={stats.data?.role} points={points} />
          </p>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {RANK_POINTS.slice().reverse().map((r) => (
              <li key={r.key}>
                {r.label} من {r.min} نقطة{rankLabel(points) === r.label ? " — مستواك الآن" : ""}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={tab === "games" ? "default" : "secondary"} onClick={() => setTab("games")}>
            الألعاب
          </Button>
          <Button size="sm" variant={tab === "tv" ? "default" : "secondary"} onClick={() => setTab("tv")}>
            التلفاز
          </Button>
          <Button size="sm" variant={tab === "radio" ? "default" : "secondary"} onClick={() => setTab("radio")}>
            الراديو
          </Button>
        </div>

        {tab === "games" ? (
          <>
            <SudokuGame />
            <ChessGame />
            <MemoryGame />
            <section className="space-y-2">
              <h2 className="text-sm">ادعُ صديقاً للعب</h2>
              {(friends.data?.friends ?? []).length === 0 ? (
                <p className="text-sm text-muted">أضف أصدقاء أولاً من تبويب الأصدقاء.</p>
              ) : (
                (friends.data?.friends ?? []).map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {f.peer.display_name}{" "}
                        <NameBadge badge={f.peer.badge} role={f.peer.role} points={f.peer.points} />
                      </p>
                      <p className="text-xs text-muted">@{f.peer.username ?? "بدون"}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        void inviteToPlay({ data: f.peer.user_id })
                          .then(() => toast.success("أُرسلت الدعوة"))
                          .catch((err) => toast.error(err instanceof Error ? err.message : "تعذر الإرسال"))
                      }
                    >
                      دعوة
                    </Button>
                  </div>
                ))
              )}
            </section>
          </>
        ) : tab === "tv" ? (
          <section className="space-y-3">
            <p className="text-sm text-muted">بث مباشر داخل التطبيق. لو قناة مش على الهواء دلوقتي جرّب غيرها.</p>
            <div className="flex flex-wrap gap-1.5">
              {NEWS_TV.map((ch) => (
                <Button key={ch.channel} size="sm" variant={tv === ch.channel ? "default" : "secondary"} onClick={() => setTv(ch.channel)}>
                  {ch.name}
                </Button>
              ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-elevated">
              <iframe
                key={tv}
                title="بث مباشر"
                className="aspect-video w-full"
                src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${tv}&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <p className="text-sm text-muted">تشغيل جوّه التطبيق ويكمل وأنت بتتنقل أو تلعب. شريط صغير يظهر أسفل الشاشة.</p>
            {(["مصر", "عربي"] as const).map((region) => (
              <div key={region} className="space-y-2">
                <h2 className="text-xs text-subtle">{region}</h2>
                {RADIO_STATIONS.filter((s) => s.region === region).map((st) => {
                  const on = radio.station?.src === st.src;
                  return (
                    <button
                      key={st.src}
                      type="button"
                      onClick={() => (on && radio.playing ? radio.toggle() : radio.play(st))}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-right text-sm hover:bg-elevated"
                    >
                      <span>{st.name}</span>
                      <span className="text-xs text-accent">{on && radio.playing ? "يعمل" : "تشغيل"}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
