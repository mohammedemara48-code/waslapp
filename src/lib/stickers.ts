export const STICKERS = [
  { id: "peace", label: "سلام" },
  { id: "bloom", label: "ورد" },
  { id: "coffee", label: "قهوة" },
  { id: "crown", label: "تاج" },
  { id: "star", label: "نجمة" },
  { id: "light", label: "ضوء" },
  { id: "key", label: "مفتاح" },
  { id: "gift", label: "هدية" },
] as const;

export type StickerId = (typeof STICKERS)[number]["id"];

export function stickerLabel(id: string): string {
  return STICKERS.find((s) => s.id === id)?.label ?? "هدية";
}
