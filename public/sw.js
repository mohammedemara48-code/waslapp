const CACHE = "wasl-shell-v2";
const SHELL = ["/", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && req.destination !== "") {
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate?.(href);
          return client.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "notify") return;
  event.waitUntil(
    self.registration.showNotification(data.title || "وصل", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { href: data.href || "/" },
      dir: "rtl",
      lang: "ar",
      vibrate: [40, 30, 80],
      tag: data.tag || "wasl-" + Date.now(),
      renotify: true,
    }),
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "وصل";
      let body = "إشعار جديد";
      let href = "/";
      try {
        if (event.data) {
          const json = event.data.json();
          title = json.title || title;
          body = json.body || body;
          href = json.href || href;
        }
      } catch {
        try {
          body = event.data ? event.data.text() : body;
        } catch {
          /* ignore */
        }
      }
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const visible = windows.some((c) => "visibilityState" in c && c.visibilityState === "visible");
      if (visible) return;
      await self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { href },
        dir: "rtl",
        lang: "ar",
        vibrate: [40, 30, 80],
        tag: "wasl-push",
        renotify: true,
      });
    })(),
  );
});
