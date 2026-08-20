import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listFriends, inviteToPlay } from "@/lib/social/server";
import { getMyPoints } from "@/lib/points/server";
import { RANK_POINTS, rankLabel } from "@/lib/points";
import { AppShell } from "@/components/app-shell";
import { NameBadge } from "@/components/name-badge";
import { SudokuGame } from "@/components/sudoku-game";
import { Button } from "@/components/ui/button";

const CHANNELS = [
  { name: "الجزيرة", href: "https://www.youtube.com/@aljazeera/live" },
  { name: "العربية", href: "https://www.youtube.com/@AlArabiya/live" },
  { name: "BBC عربي", href: "https://www.youtube.com/@bbcarabic/live" },
  { name: "موسيقى هادئة", href: "https://www.youtube.com/results?search_query=lofi+radio" },
];

export function ToolsPage() {
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const stats = useQuery({ queryKey: ["my-points"], queryFn: () => getMyPoints() });
  const [tab, setTab] = useState<"games" | "tv">("games");
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
            <li>المالك يظهر بشارة خاصة دائماً.</li>
          </ul>
        </section>

        <div className="flex gap-2">
          <Button size="sm" variant={tab === "games" ? "default" : "secondary"} onClick={() => setTab("games")}>
            الألعاب
          </Button>
          <Button size="sm" variant={tab === "tv" ? "default" : "secondary"} onClick={() => setTab("tv")}>
            التلفاز
          </Button>
        </div>

        {tab === "games" ? (
          <>
            <SudokuGame />
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
        ) : (
          <section className="space-y-3">
            <p className="text-sm text-muted">قنوات للمشاهدة في نافذة جديدة. البث يعتمد على يوتيوب.</p>
            {CHANNELS.map((ch) => (
              <a
                key={ch.name}
                href={ch.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:bg-elevated"
              >
                {ch.name}
              </a>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
