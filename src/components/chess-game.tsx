import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeChess } from "@/lib/points/server";
import { publishPost } from "@/lib/feed/server";
import {
  applyMove,
  botMove,
  CHESS_LEVELS,
  glyph,
  legalMoves,
  outcome,
  startBoard,
  type Board,
  type Move,
  type Sq,
} from "@/lib/chess";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Level = (typeof CHESS_LEVELS)[number]["id"];

export function ChessGame() {
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<Level>("easy");
  const [board, setBoard] = useState<Board>(() => startBoard());
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [sel, setSel] = useState<Sq | null>(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);
  const status = outcome(board, turn);
  const over = status === "checkmate" || status === "stalemate";
  const won = status === "checkmate" && turn === "b";
  const lost = status === "checkmate" && turn === "w";
  const depth = CHESS_LEVELS.find((l) => l.id === level)?.depth ?? 1;
  const dests = useMemo(() => {
    if (!sel) return [] as Move[];
    return legalMoves(board, "w", sel);
  }, [board, sel]);

  function reset(next?: Level) {
    if (next) setLevel(next);
    setBoard(startBoard());
    setTurn("w");
    setSel(null);
    setBusy(false);
    setPaid(false);
  }

  function play(m: Move) {
    const next = applyMove(board, m);
    setBoard(next);
    setSel(null);
    setTurn("b");
  }

  useEffect(() => {
    if (turn !== "b" || over) return;
    setBusy(true);
    const t = window.setTimeout(() => {
      const move = botMove(board, "b", depth);
      if (move) {
        setBoard(applyMove(board, move));
        setTurn("w");
      }
      setBusy(false);
    }, 280);
    return () => window.clearTimeout(t);
  }, [turn, board, depth, over]);

  function onSquare(r: number, c: number) {
    if (over || busy || turn !== "w") return;
    const hit = dests.find((m) => m.toR === r && m.toC === c);
    if (hit) {
      play(hit);
      return;
    }
    const p = board[r]![c];
    if (p && p.s === "w") setSel({ r, c });
    else setSel(null);
  }

  async function claim() {
    if (!won || paid) return;
    try {
      const res = await completeChess({ data: level });
      setPaid(true);
      void queryClient.invalidateQueries({ queryKey: ["my-points"] });
      toast.success(`+${res.amount} نقطة`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تسجيل النقاط");
    }
  }

  async function share() {
    const label = CHESS_LEVELS.find((l) => l.id === level)?.label ?? level;
    try {
      await publishPost({
        data: { kind: "text", body: `فزت على بوت الشطرنج (${label}) في وصل ♞`, visibility: "all" },
      });
      toast.success("نُشر الإنجاز");
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر النشر");
    }
  }

  return (
    <section className="rounded-xl border border-border-strong bg-surface p-4 shadow-glow">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm">شطرنج ضد بوت</h2>
        <Button size="sm" variant="secondary" onClick={() => reset()}>
          جولة جديدة
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CHESS_LEVELS.map((l) => (
          <Button key={l.id} size="sm" variant={level === l.id ? "default" : "secondary"} onClick={() => reset(l.id)}>
            {l.label} · {l.reward}ن
          </Button>
        ))}
      </div>
      <p className="mb-2 text-xs text-muted">
        أنت الأبيض. {busy ? "البوت يفكر…" : lost ? "كش مات — البوت فاز" : won ? "كش مات — فزت" : status === "stalemate" ? "تعادل" : status === "check" && turn === "w" ? "كش عليك" : "دورك"}
      </p>
      <div className="mx-auto grid max-w-sm grid-cols-8 overflow-hidden rounded-lg border border-border">
        {board.map((row, r) =>
          row.map((p, c) => {
            const dark = (r + c) % 2 === 1;
            const on = sel?.r === r && sel?.c === c;
            const mark = dests.some((m) => m.toR === r && m.toC === c);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => onSquare(r, c)}
                className={cn(
                  "grid min-h-10 place-items-center text-lg",
                  dark ? "bg-elevated" : "bg-bg",
                  on && "bg-accent/30",
                  mark && "ring-1 ring-inset ring-accent",
                )}
              >
                {p ? glyph(p) : mark ? "·" : ""}
              </button>
            );
          }),
        )}
      </div>
      {won ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void claim()} disabled={paid}>
            {paid ? "سُجّلت النقاط" : "احسب النقاط"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void share()}>
            انشر الإنجاز
          </Button>
        </div>
      ) : null}
    </section>
  );
}
