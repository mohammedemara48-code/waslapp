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

export function announceNotification(input: { title: string; body: string; href?: string | null }) {
  if (typeof window === "undefined") return;
  const payload = { type: "notify", title: input.title, body: input.body, href: input.href ?? "/" };
  try {
    navigator.vibrate?.([40, 30, 40]);
  } catch {
    /* ignore */
  }
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(payload);
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(input.title, { body: input.body, icon: "/icon-192.png" });
  }
}
