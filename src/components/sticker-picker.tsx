import { STICKERS, type StickerId } from "@/lib/stickers";
import { StickerArt } from "@/components/sticker-art";

export function StickerMark({ id, className }: { id: string; className?: string }) {
  return <StickerArt id={id} className={className ?? "size-7"} />;
}

export function StickerPicker({ onPick }: { onPick: (id: StickerId) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-elevated p-3">
      {STICKERS.map((s) => (
        <button
          key={s.id}
          type="button"
          className="flex flex-col items-center gap-1 rounded-lg py-2 hover:bg-surface active:scale-95"
          onClick={() => onPick(s.id)}
        >
          <StickerArt id={s.id} className="size-12" />
          <span className="text-[11px] text-muted">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
