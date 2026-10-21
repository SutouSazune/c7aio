const CACHE_NAME = 'c7aio-v4.3.0-live';
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
  './sodo/sd.html',
  './style/hub.css',
  './style/lich.css',
  './style/nv.css',
  './style/tb.css',
  './style/tk.css',
  './style/hs.css',
  './style/pq.css',
  './style/nk.css',
  './style/sodo.css',
  './style/console.css',
  './style/students.css',
  './script/firebase-config.js',
  './script/firebase-utils.js',
  './script/students-list.js',
  './script/students-manage.js',
  './script/hub.js',
  './script/console.js',
  './script/lich.js',
  './script/nv.js',
  './script/tb.js',
  './script/tk.js',
  './script/hs.js',
  './script/pq.js',
  './script/nk.js',
  './script/sodo.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Caching C7AIO assets v4.0.0...');
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

  // Navigation requests (HTML pages): Network-first with cache fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(request).then(cached => cached || caches.match('./index.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(request)).then(cachedResponse => {
      const networkFetch = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return networkResponse;
      });

      if (cachedResponse) {
        event.waitUntil(networkFetch);
        return cachedResponse;
      }
      return networkFetch;
    }).catch(() => {
      return caches.match(request);
    })
  );
});
