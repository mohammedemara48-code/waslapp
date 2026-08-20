import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeSudoku } from "@/lib/points/server";
import { publishPost } from "@/lib/feed/server";
import { cloneBoard, isComplete, LEVELS, makePuzzle, PUZZLES_PER_LEVEL, validAt, type SudokuLevel } from "@/lib/sudoku";
import { SUDOKU_REWARD } from "@/lib/points";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SudokuGame() {
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<SudokuLevel>("easy");
  const [puzzle, setPuzzle] = useState(1);
  const pack = useMemo(() => makePuzzle(level, puzzle), [level, puzzle]);
  const [board, setBoard] = useState(() => cloneBoard(pack.given));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [paid, setPaid] = useState(false);

  const complete = isComplete(board);

  function load(nextLevel: SudokuLevel, nextPuzzle: number) {
    const next = makePuzzle(nextLevel, nextPuzzle);
    setLevel(nextLevel);
    setPuzzle(nextPuzzle);
    setBoard(cloneBoard(next.given));
    setSelected(null);
    setPaid(false);
  }

  function put(n: number) {
    if (!selected) return;
    const { r, c } = selected;
    if (pack.given[r]![c]) return;
    setBoard((prev) => {
      const next = cloneBoard(prev);
      next[r]![c] = next[r]![c] === n ? 0 : n;
      return next;
    });
  }

  async function claim() {
    if (!complete || paid) return;
    try {
      const res = await completeSudoku({ data: { level, puzzle } });
      setPaid(true);
      void queryClient.invalidateQueries({ queryKey: ["my-points"] });
      toast.success(res.awarded ? `+${res.amount} نقطة` : "حُسبت هذه اللوحة مسبقاً");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تسجيل النقاط");
    }
  }

  async function share() {
    const label = LEVELS.find((l) => l.id === level)?.label ?? level;
    try {
      await publishPost({
        data: {
          kind: "text",
          body: `أكملت سودوكو (${label} — نموذج ${puzzle}) على وصل 🧩`,
          visibility: "all",
        },
      });
      toast.success("نُشر الإنجاز على الخط الزمني");
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر النشر");
    }
  }

  return (
    <section className="rounded-xl border border-border-strong bg-surface p-4 shadow-glow">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm">سودوكو — 48 نموذجاً</h2>
        <Button size="sm" variant="secondary" onClick={() => load(level, puzzle)}>
          إعادة
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {LEVELS.map((l) => (
          <Button key={l.id} size="sm" variant={level === l.id ? "default" : "secondary"} onClick={() => load(l.id, 1)}>
            {l.label}
          </Button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {Array.from({ length: PUZZLES_PER_LEVEL }, (_, i) => i + 1).map((n) => (
          <Button key={n} size="sm" variant={puzzle === n ? "default" : "secondary"} onClick={() => load(level, n)}>
            {n}
          </Button>
        ))}
      </div>
      <p className="mb-2 text-xs text-muted">
        {LEVELS.find((l) => l.id === level)?.label} · نموذج {puzzle} · المكافأة {SUDOKU_REWARD[level]} نقطة
      </p>
      <div className="mx-auto grid max-w-sm grid-cols-9 overflow-hidden rounded-lg border border-border">
        {board.map((row, r) =>
          row.map((n, c) => {
            const given = pack.given[r]![c]! > 0;
            const bad = n > 0 && !validAt(board, r, c, n);
            const on = selected?.r === r && selected?.c === c;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => setSelected({ r, c })}
                className={cn(
                  "min-h-10 border-border text-sm",
                  (c + 1) % 3 === 0 && c !== 8 && "border-l-2 border-l-border-strong",
                  (r + 1) % 3 === 0 && r !== 8 && "border-b-2 border-b-border-strong",
                  "border-b border-l",
                  given ? "bg-elevated text-fg" : "bg-bg text-accent",
                  on && "bg-accent/20",
                  bad && "text-danger",
                )}
              >
                {n || ""}
              </button>
            );
          }),
        )}
      </div>
      <div className="mx-auto mt-3 grid max-w-sm grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Button key={n} type="button" variant="secondary" onClick={() => put(n)}>
            {n}
          </Button>
        ))}
        <Button type="button" variant="ghost" onClick={() => put(0)}>
          مسح
        </Button>
      </div>
      {complete ? (
        <div className="mt-4 space-y-2 rounded-lg border border-ok/30 bg-ok/10 px-3 py-3 text-sm">
          <p className="text-ok">اكتملت اللوحة.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void claim()} disabled={paid}>
              {paid ? "سُجّلت النقاط" : "احسب النقاط"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void share()}>
              انشر الإنجاز
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-subtle">اختر خلية ثم اضغط رقماً من اللوحة بالأسفل.</p>
      )}
    </section>
  );
}
