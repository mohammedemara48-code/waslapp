export type RankKey = "beginner" | "star" | "expert" | "legend";

export const RANK_POINTS = [
  { key: "legend" as const, min: 400, label: "أسطوري" },
  { key: "expert" as const, min: 150, label: "خبير" },
  { key: "star" as const, min: 50, label: "مميز" },
  { key: "beginner" as const, min: 0, label: "مبتدئ" },
];

export function rankFromPoints(points: number | null | undefined): RankKey {
  const n = points ?? 0;
  if (n >= 400) return "legend";
  if (n >= 150) return "expert";
  if (n >= 50) return "star";
  return "beginner";
}

export function rankLabel(points: number | null | undefined): string {
  const key = rankFromPoints(points);
  return RANK_POINTS.find((r) => r.key === key)?.label ?? "مبتدئ";
}

export const SUDOKU_REWARD: Record<string, number> = {
  easy: 15,
  medium: 25,
  hard: 40,
  expert: 60,
};
