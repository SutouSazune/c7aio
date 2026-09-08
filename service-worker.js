const CACHE_NAME = 'c7aio-v3.5.3-cache-first';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './lich/lich.html',
  './nhiemvu/nv.html',
  './thongbao/tb.html',
  './thongke/tk.html',
  './hoso/hs.html',
  './perm/pq.html',
  './logs/nk.html',
  './style/hub.css',
  './style/lich.css',
  './style/nv.css',
  './style/tb.css',
  './style/tk.css',
  './style/hs.css',
  './style/pq.css',
  './style/nk.css',
  './script/firebase-config.js',
  './script/firebase-utils.js',
  './script/students-list.js',
  './script/hub.js',
  './script/console.js',
  './script/lich.js',
  './script/nv.js',
  './script/tb.js',
  './script/tk.js',
  './script/hs.js',
  './script/pq.js',
  './script/nk.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Caching C7AIO assets v3.0.0...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('Lỗi khi cache một số assets:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('🗑️ Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    // Cache-first (stale-while-revalidate): serve the cached asset instantly so
    // reloads do not block on a network round-trip + JS parse. Refresh in the
    // background so a deployed update is picked up on the next visit.
    caches.open(CACHE_NAME).then(cache => cache.match(request)).then(cachedResponse => {
      const networkFetch = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      });

      if (cachedResponse) {
        // Serve cached copy immediately, update in background
        event.waitUntil(networkFetch);
        return cachedResponse;
      }
      return networkFetch;
    }).catch(() => {
      return caches.match(request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
