const CACHE_NAME = 'c7aio-v9.0.0-prismatic';
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
  './style/tokens.css',
  './style/login.css',
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
  './script/offline-engine.js',
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
  './script/sodo.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Caching C7AIO assets v6.2.0...');
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
    // Network-first with fast Cache fallback so UI/CSS/JS updates apply immediately on reload
    fetch(request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
      }
      return networkResponse;
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

// Periodic & Event-driven Background Sync
self.addEventListener('sync', event => {
  if (event.tag === 'c7-sync-vault') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'C7_TRIGGER_VAULT_SYNC' });
        });
      })
    );
  }
});
