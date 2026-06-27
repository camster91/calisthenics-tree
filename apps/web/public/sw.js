/**
 * Calisthenics Tree service worker.
 *
 * Strategy:
 * - App shell (HTML, JS, CSS, fonts): stale-while-revalidate. Always
 *   return the cached version instantly if available, refresh in
 *   background. Fast cold starts, fresh content on next visit.
 * - Images: cache-first. Static PNGs (icons, share cards) never change
 *   content-addressed.
 * - API calls (/api/v1/*): network-only. Don't cache responses —
 *   they have user-specific auth and the local-mode mock handles
 *   offline scenarios. If the request fails and we have no cache,
 *   the api() wrapper surfaces the error to the caller.
 * - /healthz: network-only.
 * - /share/<id>.png: cache-first.
 *
 * Bump CACHE_NAME to invalidate old caches on deploy.
 */
const CACHE_NAME = 'ct-shell-v2';
const APP_SHELL = [
  '/',
  '/login',
  '/welcome',
  '/privacy',
  '/terms',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-only for API + healthz
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') {
    event.respondWith(fetch(req));
    return;
  }

  // Cache-first for share PNGs (static, content-addressed by filename)
  if (url.pathname.startsWith('/share/') && url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })),
    );
    return;
  }

  // Cache-first for icon files
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })),
    );
    return;
  }

  // Stale-while-revalidate for everything else (HTML, JS, CSS)
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((res) => {
        // Only cache successful responses
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    }),
  );
});