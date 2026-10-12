const CACHE = "wasl-shell-v4";
const SHELL = ["/", "/favicon.svg", "/icon-192.png", "/icon-512.png", "/icon-maskable.svg", "/manifest.webmanifest"];

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
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(fetch(req).catch(() => caches.match("/").then((hit) => hit || fetch(req))));
    return;
  }
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && (req.destination === "script" || req.destination === "style" || req.destination === "image" || req.destination === "font")) {
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
  );
});

function openOrFocus(href) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if ("focus" in client) {
        client.navigate?.(href);
        return client.focus();
      }
    }
    return self.clients.openWindow(href);
  });
}

async function setBadge(n) {
  try {
    if (n > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(n);
    else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  } catch {
    /* unsupported */
  }
}

async function markRead(data) {
  if (!data || !data.uid || !data.readHref || !data.readToken) return;
  try {
    const res = await fetch("/api/push/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: data.uid, href: data.readHref, token: data.readToken }),
    });
    const json = await res.json().catch(() => null);
    if (json && typeof json.unread === "number") await setBadge(json.unread);
  } catch {
    /* offline */
  }
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  const href = data.href || "/";
  event.notification.close();
  if (event.action === "read" || event.action === "decline") {
    event.waitUntil(markRead(data));
    return;
  }
  if (event.action === "answer") {
    const sep = href.includes("?") ? "&" : "?";
    event.waitUntil(openOrFocus(href + sep + "answer=1"));
    return;
  }
  event.waitUntil(openOrFocus(href));
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
      let p = {};
      try {
        p = event.data ? event.data.json() : {};
      } catch {
        try {
          p = { body: event.data ? event.data.text() : "" };
        } catch {
          p = {};
        }
      }
      const title = p.title || "وصل";
      const body = p.body || "إشعار جديد";
      const href = p.href || "/";
      const kind = p.kind || "message";
      const tag = p.tag || "wasl-push";
      if (typeof p.badge === "number") await setBadge(p.badge);
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const visible = windows.some((c) => "visibilityState" in c && c.visibilityState === "visible");
      if (visible) return;
      const data = { href, kind, uid: p.uid, readHref: p.readHref, readToken: p.readToken, lines: [body] };
      let shownTitle = title;
      let shownBody = body;
      if (kind !== "call") {
        // Stack messages of the same chat into one notification, like WhatsApp.
        const prev = await self.registration.getNotifications({ tag });
        const old = prev[0] && prev[0].data && Array.isArray(prev[0].data.lines) ? prev[0].data.lines : [];
        data.lines = old.concat(body).slice(-5);
        const count = old.length + 1;
        if (count > 1) {
          shownTitle = `${title} · ${count} رسائل جديدة`;
          shownBody = data.lines.join("\n");
        }
      }
      const isCall = kind === "call";
      await self.registration.showNotification(shownTitle, {
        body: shownBody,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data,
        dir: "rtl",
        lang: "ar",
        tag,
        renotify: true,
        requireInteraction: isCall,
        vibrate: isCall ? [400, 200, 400, 200, 400, 200, 400] : [40, 30, 80],
        actions: isCall
          ? [
              { action: "answer", title: "رد" },
              { action: "decline", title: "رفض" },
            ]
          : p.readToken
            ? [{ action: "read", title: "تمييز كمقروء" }]
            : [],
      });
    })(),
  );
});
