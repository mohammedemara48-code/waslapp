export const STORY_FILTERS = [
  { id: "none", label: "أصلي", className: "fx-none" },
  { id: "warm", label: "دافئ", className: "fx-warm" },
  { id: "cool", label: "بارد", className: "fx-cool" },
  { id: "noir", label: "حبر", className: "fx-noir" },
  { id: "soft", label: "ناعم", className: "fx-soft" },
] as const;

export const STORY_TRACKS = [
  { id: "off", label: "بدون موسيقى" },
  { id: "quiet", label: "هدوء" },
  { id: "string", label: "وتر" },
  { id: "night", label: "ليل" },
  { id: "pulse", label: "نبض" },
] as const;

export function filterClass(id: string | null | undefined) {
  return STORY_FILTERS.find((f) => f.id === id)?.className ?? "fx-none";
}

export function packStoryStyle(bg: string, filter: string, music: string) {
  return `${bg}|${filter}|${music}`;
}

export function parseStoryStyle(tint: string | null | undefined) {
  const [bg, filter, music] = (tint || "ink").split("|");
  return { bg: bg || "ink", filter: filter || "none", music: music || "off" };
}

let audioCtx: AudioContext | null = null;
let nodes: OscillatorNode[] = [];

export function stopStoryMusic() {
  for (const n of nodes) {
    try {
      n.stop();
    } catch {
      /* already stopped */
    }
  }
  nodes = [];
}

export function playStoryMusic(id: string | null | undefined) {
  stopStoryMusic();
  if (!id || id === "off" || typeof window === "undefined") return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  audioCtx ??= new AC();
  const ctx = audioCtx;
  const tones: Record<string, number[]> = {
    quiet: [220, 330],
    string: [196, 247, 294],
    night: [174, 220],
    pulse: [110, 165],
  };
  const freqs = tones[id] ?? [220];
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = id === "pulse" ? "square" : "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    nodes.push(osc);
  }
}
