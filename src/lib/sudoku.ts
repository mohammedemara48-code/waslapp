export type SudokuLevel = "easy" | "medium" | "hard" | "expert";

export const LEVELS: { id: SudokuLevel; label: string; holes: number }[] = [
  { id: "easy", label: "سهل", holes: 36 },
  { id: "medium", label: "متوسط", holes: 46 },
  { id: "hard", label: "صعب", holes: 54 },
  { id: "expert", label: "خبير", holes: 58 },
];

export const PUZZLES_PER_LEVEL = 12;

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyBoard(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function validAt(board: number[][], r: number, c: number, n: number) {
  for (let i = 0; i < 9; i++) {
    if (i !== c && board[r]![i] === n) return false;
    if (i !== r && board[i]![c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if ((br + i !== r || bc + j !== c) && board[br + i]![bc + j] === n) return false;
    }
  }
  return true;
}

function fill(board: number[][], random: () => number): boolean {
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    if (board[r]![c]) continue;
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => random() - 0.5);
    for (const n of nums) {
      if (validAt(board, r, c, n)) {
        board[r]![c] = n;
        if (fill(board, random)) return true;
        board[r]![c] = 0;
      }
    }
    return false;
  }
  return true;
}

export function makePuzzle(level: SudokuLevel, index: number) {
  const holes = LEVELS.find((l) => l.id === level)?.holes ?? 36;
  const seed = level.charCodeAt(0) * 1000 + index * 97 + 13;
  const random = mulberry(seed);
  const solution = emptyBoard();
  fill(solution, random);
  const given = solution.map((row) => row.slice());
  const order = Array.from({ length: 81 }, (_, i) => i).sort(() => random() - 0.5);
  for (let i = 0; i < holes; i++) {
    const p = order[i]!;
    given[Math.floor(p / 9)]![p % 9] = 0;
  }
  return { given, solution };
}

export function cloneBoard(board: number[][]) {
  return board.map((row) => row.slice());
}

export function isComplete(board: number[][]) {
  return board.every((row, r) => row.every((n, c) => n > 0 && validAt(board, r, c, n)));
}
