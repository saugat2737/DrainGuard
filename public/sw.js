const CACHE_NAME = 'drainguard-v1';

const STATIC_ASSETS = [
  '/',
  '/site.webmanifest',
  '/assets/favicon.svg',
  '/assets/drainguard-logo.svg',
  '/assets/drainguard-logo-dark.svg',
  '/assets/drainguard-icon.svg',
  '/assets/android-chrome-192x192.png',
  '/assets/android-chrome-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS GET requests; ignore chrome-extension://, ws://, etc.
  if (event.request.method !== 'GET') {
    return;
  }

  var url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return;
  }

  // Strictly skip non-HTTP(S) schemes (e.g. chrome-extension://, moz-extension://)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Allow API routes to be handled live or by Next.js app cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Stale-while-revalidate for static shell assets and navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
