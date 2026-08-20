import { VAPID_PUBLIC_KEY } from "@/lib/push/keys";
import { savePushSubscription } from "@/lib/push/server";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const register = () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribeWebPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    await savePushSubscription({
      data: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function enableBrowserNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "denied") return false;
  if (Notification.permission !== "granted") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return false;
  }
  void subscribeWebPush();
  return true;
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
