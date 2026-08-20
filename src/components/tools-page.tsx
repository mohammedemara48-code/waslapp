import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listFriends, inviteToPlay } from "@/lib/social/server";
import { AppShell } from "@/components/app-shell";
import { NameBadge } from "@/components/name-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GIVEN = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

function cloneBoard() {
  return GIVEN.map((row) => row.slice());
}

function validAt(board: number[][], r: number, c: number, n: number) {
  for (let i = 0; i < 9; i++) {
    if (i !== c && board[r][i] === n) return false;
    if (i !== r && board[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if ((br + i !== r || bc + j !== c) && board[br + i][bc + j] === n) return false;
    }
  }
  return true;
}

export function ToolsPage() {
  const friends = useQuery({ queryKey: ["friends"], queryFn: () => listFriends() });
  const [board, setBoard] = useState(cloneBoard);
  const complete = useMemo(
    () => board.every((row, r) => row.every((n, c) => n > 0 && validAt(board, r, c, n))),
    [board],
  );

  function setCell(r: number, c: number, n: number) {
    if (GIVEN[r][c]) return;
    setBoard((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = next[r][c] === n ? 0 : n;
      return next;
    });
  }

  return (
    <AppShell active="tools">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
        <div>
          <p className="text-sm text-accent">استراحة بين المحادثات</p>
          <h1 className="mt-1 font-display text-3xl">أدوات</h1>
        </div>

        <section className="rounded-xl border border-border-strong bg-surface p-4 shadow-glow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm">سودوكو</h2>
            <Button size="sm" variant="secondary" onClick={() => setBoard(cloneBoard())}>
              إعادة
            </Button>
          </div>
          {complete ? <p className="mb-3 text-sm text-ok">أحسنت، اكتملت اللوحة.</p> : null}
          <div className="mx-auto grid max-w-sm grid-cols-9 overflow-hidden rounded-lg border border-border">
            {board.map((row, r) =>
              row.map((n, c) => {
                const given = GIVEN[r][c] > 0;
                const bad = n > 0 && !validAt(board, r, c, n);
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={given}
                    onClick={() => setCell(r, c, ((n % 9) + 1))}
                    className={cn(
                      "min-h-10 border-border text-sm",
                      (c + 1) % 3 === 0 && c !== 8 && "border-l-2 border-l-border-strong",
                      (r + 1) % 3 === 0 && r !== 8 && "border-b-2 border-b-border-strong",
                      "border-b border-l",
                      given ? "bg-elevated text-fg" : "bg-bg text-accent",
                      bad && "text-danger",
                    )}
                  >
                    {n || ""}
                  </button>
                );
              }),
            )}
          </div>
          <p className="mt-3 text-xs text-subtle">اضغط الخلية لتدوير الأرقام من 1 إلى 9.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm">ادعُ صديقاً للعب</h2>
          {(friends.data?.friends ?? []).length === 0 ? (
            <p className="text-sm text-muted">أضف أصدقاء أولاً من تبويب الأصدقاء.</p>
          ) : (
            (friends.data?.friends ?? []).map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {f.peer.display_name} <NameBadge badge={f.peer.badge} />
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
