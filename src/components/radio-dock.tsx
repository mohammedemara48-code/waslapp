import { Pause, Play, Radio, X } from "lucide-react";
import { useRadio } from "@/lib/radio";
import { Button } from "@/components/ui/button";

export function RadioDock() {
  const { station, playing, toggle, stop } = useRadio();
  if (!station) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 lg:bottom-4">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-2 shadow-glow backdrop-blur">
        <Radio className="size-4 shrink-0 text-accent" />
        <p className="min-w-0 flex-1 truncate text-xs">{station.name}</p>
        <Button size="sm" variant="secondary" onClick={() => toggle()} aria-label={playing ? "إيقاف مؤقت" : "تشغيل"}>
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => stop()} aria-label="إيقاف الراديو">
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
