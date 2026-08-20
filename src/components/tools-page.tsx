import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listFriends, inviteToPlay } from "@/lib/social/server";
import { getMyPoints } from "@/lib/points/server";
import { RANK_POINTS, rankLabel } from "@/lib/points";
import { AppShell } from "@/components/app-shell";
import { NameBadge } from "@/components/name-badge";
import { SudokuGame } from "@/components/sudoku-game";
import { ChessGame } from "@/components/chess-game";
import { MemoryGame } from "@/components/memory-game";
import { Button } from "@/components/ui/button";

export function ToolsPage() {
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const stats = useQuery({ queryKey: ["my-points"], queryFn: () => getMyPoints() });
  const [game, setGame] = useState<"sudoku" | "chess" | "memory">("sudoku");
  const points = stats.data?.points ?? 0;

  return (
    <AppShell active="tools">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
        <div>
          <p className="text-sm text-accent">العب واجمع نقاط</p>
          <h1 className="mt-1 font-display text-3xl">الألعاب</h1>
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
          <Button size="sm" variant={game === "sudoku" ? "default" : "secondary"} onClick={() => setGame("sudoku")}>
            سودوكو
          </Button>
          <Button size="sm" variant={game === "chess" ? "default" : "secondary"} onClick={() => setGame("chess")}>
            شطرنج
          </Button>
          <Button size="sm" variant={game === "memory" ? "default" : "secondary"} onClick={() => setGame("memory")}>
            ذاكرة
          </Button>
        </div>

        {game === "sudoku" ? <SudokuGame /> : null}
        {game === "chess" ? <ChessGame /> : null}
        {game === "memory" ? <MemoryGame /> : null}

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
      </div>
    </AppShell>
  );
}
