import { Coffee, Crown, Gift, KeyRound, Sparkles, Star, Sun, Flower2 } from "lucide-react";
import { STICKERS, type StickerId } from "@/lib/stickers";
import { Button } from "@/components/ui/button";

const ICONS: Record<StickerId, typeof Gift> = {
  peace: Sparkles,
  bloom: Flower2,
  coffee: Coffee,
  crown: Crown,
  star: Star,
  light: Sun,
  key: KeyRound,
  gift: Gift,
};

export function StickerMark({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id as StickerId] ?? Gift;
  return <Icon className={className ?? "size-5"} />;
}

export function StickerPicker({ onPick }: { onPick: (id: StickerId) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {STICKERS.map((s) => {
        const Icon = ICONS[s.id];
        return (
          <Button key={s.id} type="button" variant="secondary" className="h-16 flex-col gap-1" onClick={() => onPick(s.id)}>
            <Icon className="size-5 text-accent" />
            <span className="text-[11px]">{s.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
