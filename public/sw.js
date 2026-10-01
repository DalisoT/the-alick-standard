/**
 * THE ALICK STANDARD — Service Worker
 *
 * Responsibilities:
 *   1. Cache app shell + static assets for offline-first launch
 *   2. Network-first for HTML pages (always show the freshest content)
 *   3. Stale-while-revalidate for static assets
 *   4. Handle Web Push events and show native notifications
 *   5. Notification-click → focus/open the relevant page
 */

const VERSION = "tas-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/services",
  "/about",
  "/book",
  "/icon.svg",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => console.warn("[sw] precache failed", url, err)),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache API
  if (url.pathname.startsWith("/admin/")) return; // never cache admin

  // HTML navigations → network first, fall back to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        } catch {
          const cached = await caches.match(req);
          return cached || caches.match("/");
        }
      })(),
    );
    return;
  }

  // Static assets → stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "THE ALICK STANDARD",
    body: "You have a new update.",
    url: "/",
    tag: "tas-general",
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url },
      vibrate: [80, 40, 80],
      requireInteraction: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.includes(targetUrl)) {
          await c.focus();
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});