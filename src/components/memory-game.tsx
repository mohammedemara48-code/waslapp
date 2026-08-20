import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeMemory } from "@/lib/points/server";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMOJIS = ["🌙", "⭐", "🔥", "💎", "🎯", "🎵", "🏠", "🚀"];

type Level = "easy" | "medium" | "hard";

const LEVELS: { id: Level; label: string; pairs: number; reward: number }[] = [
  { id: "easy", label: "سهل", pairs: 4, reward: 8 },
  { id: "medium", label: "متوسط", pairs: 6, reward: 14 },
  { id: "hard", label: "صعب", pairs: 8, reward: 22 },
];

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function buildDeck(pairs: number) {
  const picks = EMOJIS.slice(0, pairs);
  return shuffle([...picks, ...picks].map((emoji, i) => ({ id: i, emoji, key: `${emoji}-${i}` })));
}

export function MemoryGame() {
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<Level>("easy");
  const cfg = LEVELS.find((l) => l.id === level)!;
  const [deck, setDeck] = useState(() => buildDeck(cfg.pairs));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [paid, setPaid] = useState(false);
  const done = matched.length === cfg.pairs;

  function reset(next?: Level) {
    const lv = next ?? level;
    if (next) setLevel(next);
    const c = LEVELS.find((l) => l.id === lv)!;
    setDeck(buildDeck(c.pairs));
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setLock(false);
    setPaid(false);
  }

  function flip(idx: number) {
    if (lock || open.includes(idx) || matched.includes(deck[idx]!.emoji)) return;
    const next = [...open, idx];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next;
    const ea = deck[a!]!.emoji;
    const eb = deck[b!]!.emoji;
    if (ea === eb) {
      setMatched((m) => [...m, ea]);
      setOpen([]);
    } else {
      setLock(true);
      window.setTimeout(() => {
        setOpen([]);
        setLock(false);
      }, 550);
    }
  }

  async function claim() {
    if (!done || paid) return;
    try {
      const res = await completeMemory({ data: level });
      setPaid(true);
      void queryClient.invalidateQueries({ queryKey: ["my-points"] });
      toast.success(res.awarded ? `+${res.amount} نقطة` : "تم التسجيل");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر تسجيل النقاط");
    }
  }

  return (
    <section className="rounded-xl border border-border-strong bg-surface p-4 shadow-glow">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm">لعبة الذاكرة</h2>
        <Button size="sm" variant="secondary" onClick={() => reset()}>
          جولة جديدة
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {LEVELS.map((l) => (
          <Button key={l.id} size="sm" variant={level === l.id ? "default" : "secondary"} onClick={() => reset(l.id)}>
            {l.label} · {l.reward}ن
          </Button>
        ))}
      </div>
      <p className="mb-2 text-xs text-muted">
        حركات: {moves}
        {done ? " · اكتملت!" : ""}
      </p>
      <div className="mx-auto grid max-w-sm grid-cols-4 gap-2">
        {deck.map((card, idx) => {
          const show = open.includes(idx) || matched.includes(card.emoji);
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => flip(idx)}
              className={cn(
                "grid aspect-square place-items-center rounded-lg border text-2xl transition",
                show ? "border-accent bg-elevated" : "border-border bg-bg text-transparent",
              )}
            >
              {show ? card.emoji : "?"}
            </button>
          );
        })}
      </div>
      {done ? (
        <div className="mt-3">
          <Button size="sm" onClick={() => void claim()} disabled={paid}>
            {paid ? "سُجّلت النقاط" : "احسب النقاط"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
