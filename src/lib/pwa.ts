export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const register = () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

export async function enableBrowserNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

let audioCtx: AudioContext | null = null;

export function playMessageSound() {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.12);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  } catch {
    /* ignore */
  }
}

export function announceNotification(input: { title: string; body: string; href?: string | null }) {
  if (typeof window === "undefined") return;
  playMessageSound();
  try {
    navigator.vibrate?.([40, 30, 40]);
  } catch {
    /* ignore */
  }
  const payload = { type: "notify", title: input.title, body: input.body, href: input.href ?? "/" };
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(payload);
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(input.title, {
      body: input.body,
      icon: "/icon-192.png",
    });
  }
}
