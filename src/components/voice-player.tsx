import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

function barsFromSrc(src: string, count = 28) {
  let h = src.length * 9973;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (Math.imul(h, 1664525) + 1013904223 + i * 97) >>> 0;
    out.push(0.22 + (h % 78) / 100);
  }
  return out;
}

function formatSec(n: number) {
  const s = Math.max(0, Math.floor(n));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function VoicePlayer({ src, accent }: { src: string; accent?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const bars = useMemo(() => barsFromSrc(src), [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => {
      setProgress(el.duration ? el.currentTime / el.duration : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, [src]);

  async function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    try {
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <div className={cn("mt-2 flex min-w-52 items-center gap-2 rounded-full px-2 py-1.5", accent ? "bg-accent-fg/10" : "bg-bg/50")}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          accent ? "bg-accent-fg/15 text-accent-fg" : "bg-accent text-accent-fg",
        )}
        onClick={() => void toggle()}
        aria-label={playing ? "إيقاف" : "تشغيل"}
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-px">
        {bars.map((h, i) => {
          const lit = i / bars.length <= progress;
          return (
            <span
              key={i}
              className={cn("w-1 rounded-full", lit ? (accent ? "bg-accent-fg" : "bg-accent") : accent ? "bg-accent-fg/35" : "bg-muted")}
              style={{ height: `${Math.round(h * 100)}%` }}
            />
          );
        })}
      </div>
      <span className={cn("w-10 text-end text-[11px] tabular-nums", accent ? "text-accent-fg/80" : "text-muted")}>
        {formatSec(playing || progress > 0 ? duration * (1 - progress) : duration)}
      </span>
    </div>
  );
}
