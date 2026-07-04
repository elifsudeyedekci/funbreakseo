/* FunBreak SEO — basit service worker (PWA kurulabilirlik + statik önbellek) */
const CACHE_NAME = 'funbreakseo-v1';
const STATIC_ASSETS = ['/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // API çağrılarını ve farklı origin'leri karışma — daima ağ
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;

  // Statik varlıklar: cache-first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json' || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // Sayfa gezinmeleri: network-first, çevrimdışıysa cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
  }
});
