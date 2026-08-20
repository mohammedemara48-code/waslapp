export type Side = "w" | "b";
export type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
export type Piece = { s: Side; t: PieceType };
export type Board = (Piece | null)[][];
export type Sq = { r: number; c: number };
export type Move = Sq & { toR: number; toC: number; promo?: PieceType; castle?: "k" | "q" };

export const CHESS_LEVELS = [
  { id: "easy" as const, label: "سهل", depth: 1, reward: 20 },
  { id: "medium" as const, label: "متوسط", depth: 2, reward: 35 },
  { id: "hard" as const, label: "صعب", depth: 2, reward: 55 },
];

const GLYPH: Record<Side, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

export function glyph(p: Piece) {
  return GLYPH[p.s][p.t];
}

const VAL: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

export function startBoard(): Board {
  const b: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let c = 0; c < 8; c++) {
    b[0]![c] = { s: "b", t: back[c]! };
    b[1]![c] = { s: "b", t: "p" };
    b[6]![c] = { s: "w", t: "p" };
    b[7]![c] = { s: "w", t: back[c]! };
  }
  return b;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function inb(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function findKing(board: Board, side: Side): Sq | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r]![c];
      if (p && p.s === side && p.t === "k") return { r, c };
    }
  }
  return null;
}

function attacked(board: Board, r: number, c: number, by: Side): boolean {
  const enemy = by;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (const [dr, dc] of dirs) {
    const slide = Math.abs(dr) + Math.abs(dc) === 1 ? "r" : "b";
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i;
      const nc = c + dc * i;
      if (!inb(nr, nc)) break;
      const p = board[nr]![nc];
      if (!p) continue;
      if (p.s !== enemy) break;
      if (p.t === "q" || p.t === slide) return true;
      if (i === 1 && p.t === "k") return true;
      break;
    }
  }
  const kn = [
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
  ];
  for (const [dr, dc] of kn) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inb(nr, nc)) continue;
    const p = board[nr]![nc];
    if (p && p.s === enemy && p.t === "n") return true;
  }
  const pr = enemy === "w" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const nr = r + pr;
    const nc = c + dc;
    if (!inb(nr, nc)) continue;
    const p = board[nr]![nc];
    if (p && p.s === enemy && p.t === "p") return true;
  }
  return false;
}

export function inCheck(board: Board, side: Side) {
  const k = findKing(board, side);
  if (!k) return true;
  return attacked(board, k.r, k.c, side === "w" ? "b" : "w");
}

function addMove(list: Move[], board: Board, side: Side, r: number, c: number, toR: number, toC: number, extra?: Partial<Move>) {
  const next = applyMove(board, { r, c, toR, toC, ...extra });
  if (!inCheck(next, side)) list.push({ r, c, toR, toC, ...extra });
}

function ray(list: Move[], board: Board, side: Side, r: number, c: number, dr: number, dc: number) {
  for (let i = 1; i < 8; i++) {
    const nr = r + dr * i;
    const nc = c + dc * i;
    if (!inb(nr, nc)) break;
    const t = board[nr]![nc];
    if (!t) addMove(list, board, side, r, c, nr, nc);
    else {
      if (t.s !== side) addMove(list, board, side, r, c, nr, nc);
      break;
    }
  }
}

export function legalMoves(board: Board, side: Side, from?: Sq): Move[] {
  const list: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (from && (from.r !== r || from.c !== c)) continue;
      const p = board[r]![c];
      if (!p || p.s !== side) continue;
      if (p.t === "p") {
        const dir = side === "w" ? -1 : 1;
        const start = side === "w" ? 6 : 1;
        const one = r + dir;
        if (inb(one, c) && !board[one]![c]) {
          if (one === 0 || one === 7) addMove(list, board, side, r, c, one, c, { promo: "q" });
          else addMove(list, board, side, r, c, one, c);
          const two = r + dir * 2;
          if (r === start && inb(two, c) && !board[two]![c]) addMove(list, board, side, r, c, two, c);
        }
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inb(one, nc)) continue;
          const t = board[one]![nc];
          if (t && t.s !== side) {
            if (one === 0 || one === 7) addMove(list, board, side, r, c, one, nc, { promo: "q" });
            else addMove(list, board, side, r, c, one, nc);
          }
        }
      } else if (p.t === "n") {
        for (const [dr, dc] of [
          [2, 1],
          [2, -1],
          [-2, 1],
          [-2, -1],
          [1, 2],
          [1, -2],
          [-1, 2],
          [-1, -2],
        ]) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inb(nr, nc)) continue;
          const t = board[nr]![nc];
          if (!t || t.s !== side) addMove(list, board, side, r, c, nr, nc);
        }
      } else if (p.t === "b" || p.t === "r" || p.t === "q") {
        const rays =
          p.t === "b"
            ? [
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
              ]
            : p.t === "r"
              ? [
                  [1, 0],
                  [-1, 0],
                  [0, 1],
                  [0, -1],
                ]
              : [
                  [1, 0],
                  [-1, 0],
                  [0, 1],
                  [0, -1],
                  [1, 1],
                  [1, -1],
                  [-1, 1],
                  [-1, -1],
                ];
        for (const [dr, dc] of rays) ray(list, board, side, r, c, dr, dc);
      } else if (p.t === "k") {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (!inb(nr, nc)) continue;
            const t = board[nr]![nc];
            if (!t || t.s !== side) addMove(list, board, side, r, c, nr, nc);
          }
        }
      }
    }
  }
  return list;
}

export function applyMove(board: Board, m: Move): Board {
  const next = cloneBoard(board);
  const p = next[m.r]![m.c];
  next[m.r]![m.c] = null;
  if (!p) return next;
  const piece = m.promo ? { s: p.s, t: m.promo } : p;
  next[m.toR]![m.toC] = piece;
  return next;
}

function evaluate(board: Board, side: Side) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r]![c];
      if (!p) continue;
      const v = VAL[p.t] + (p.t === "p" ? (p.s === "w" ? 6 - r : r - 1) * 4 : 0);
      score += p.s === side ? v : -v;
    }
  }
  return score;
}

function orderMoves(board: Board, moves: Move[]) {
  return moves
    .map((m) => {
      const cap = board[m.toR]![m.toC];
      return { m, s: cap ? VAL[cap.t] * 10 - VAL[board[m.r]![m.c]?.t ?? "p"] : 0 };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.m);
}

function minimax(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  ai: Side,
  budget: { n: number },
): number {
  if (budget.n-- <= 0) return evaluate(board, ai);
  const moves = orderMoves(board, legalMoves(board, side));
  if (depth === 0 || moves.length === 0) {
    if (moves.length === 0) {
      if (inCheck(board, side)) return side === ai ? -50000 - depth : 50000 + depth;
      return 0;
    }
    return evaluate(board, ai);
  }
  if (side === ai) {
    let best = -1e9;
    for (const m of moves) {
      const val = minimax(applyMove(board, m), side === "w" ? "b" : "w", depth - 1, alpha, beta, ai, budget);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = 1e9;
  for (const m of moves) {
    const val = minimax(applyMove(board, m), side === "w" ? "b" : "w", depth - 1, alpha, beta, ai, budget);
    if (val < best) best = val;
    if (best < beta) beta = best;
    if (beta <= alpha) break;
  }
  return best;
}

export function botMove(board: Board, side: Side, depth: number): Move | null {
  const moves = orderMoves(board, legalMoves(board, side));
  if (!moves.length) return null;
  const budget = { n: depth <= 1 ? 400 : 1200 };
  let best = moves[0]!;
  let bestScore = -1e9;
  for (const m of moves) {
    const val = minimax(applyMove(board, m), side === "w" ? "b" : "w", Math.max(0, depth - 1), -1e9, 1e9, side, budget);
    const jitter = (m.r + m.c + m.toR + m.toC) % 5;
    const score = val + jitter;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
    if (budget.n <= 0) break;
  }
  return best;
}

export function capturedBy(board: Board, taker: Side): Piece[] {
  const start: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const victim: Side = taker === "w" ? "b" : "w";
  const left: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const row of board) {
    for (const p of row) {
      if (p && p.s === victim) left[p.t] += 1;
    }
  }
  const out: Piece[] = [];
  (["q", "r", "b", "n", "p"] as PieceType[]).forEach((t) => {
    const n = start[t] - left[t];
    for (let i = 0; i < n; i++) out.push({ s: victim, t });
  });
  return out;
}

export function outcome(board: Board, side: Side): "checkmate" | "stalemate" | "check" | null {
  const moves = legalMoves(board, side);
  const chk = inCheck(board, side);
  if (moves.length === 0) return chk ? "checkmate" : "stalemate";
  return chk ? "check" : null;
}
