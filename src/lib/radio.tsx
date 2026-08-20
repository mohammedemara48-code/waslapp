import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { RadioStation } from "@/lib/broadcast";

type RadioCtx = {
  station: RadioStation | null;
  playing: boolean;
  play: (station: RadioStation) => void;
  toggle: () => void;
  stop: () => void;
};

const Ctx = createContext<RadioCtx | null>(null);

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [station, setStation] = useState<RadioStation | null>(null);
  const [playing, setPlaying] = useState(false);

  const api = useMemo<RadioCtx>(
    () => ({
      station,
      playing,
      play(next) {
        const el = audioRef.current;
        if (!el) return;
        if (station?.src !== next.src) {
          el.src = next.src;
        }
        setStation(next);
        void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      },
      toggle() {
        const el = audioRef.current;
        if (!el || !station) return;
        if (el.paused) {
          void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
          el.pause();
          setPlaying(false);
        }
      },
      stop() {
        const el = audioRef.current;
        if (el) {
          el.pause();
          el.removeAttribute("src");
          el.load();
        }
        setPlaying(false);
        setStation(null);
      },
    }),
    [station, playing],
  );

  return (
    <Ctx.Provider value={api}>
      <audio
        ref={audioRef}
        className="hidden"
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {children}
    </Ctx.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("RadioProvider missing");
  return ctx;
}
