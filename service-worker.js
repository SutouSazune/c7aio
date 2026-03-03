const CACHE_NAME = 'c7aio-v2.3.1-fix-config'; // BUMP VERSION: Force update config & hub.js
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './lich/lich.html',
  './nhiemvu/nv.html',
  './thongbao/tb.html',
  './thongke/tk.html',
  './hoso/hs.html',
  './style/hub.css',
  './style/lich.css',
  './style/nv.css',
  './style/tb.css',
  './style/tk.css',
  './style/hs.css',
  './script/hub.js',
  './script/lich.js',
  './script/nv.js',
  './script/tb.js',
  './script/tk.js',
  './script/hs.js',
  './manifest.json'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Caching assets v1.0.0...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('Lỗi khi cache một số assets, tiếp tục...', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting(); // Kích hoạt ngay mà không đợi
});

// Activate event - clean old caches
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
  self.clients.claim(); // Kiểm soát tất cả clients ngay lập tức
});

// Fetch event - Chiến lược: Network-first cho HTML/JS/CSS, Cache-first cho icon/font
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Bỏ qua các request không phải GET
  if (request.method !== 'GET') {
    return;
  }

  // Handle directory requests - redirect to index.html
  if (request.destination === 'document') {
    // Nếu là request cho document (HTML page)
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            // Nếu 404, thử fetch index.html của folder đó
            if (networkResponse.status === 404) {
              const pathWithIndex = url.pathname.endsWith('/') 
                ? url.pathname + 'index.html'
                : url.pathname + '/index.html';
              
              return fetch(pathWithIndex)
                .catch(() => caches.match('./index.html'));
            }
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Network error - use cache
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('📦 Phục vụ từ cache:', request.url);
              return cachedResponse;
            }

            // Try to serve index.html from the directory
            const pathWithIndex = url.pathname.endsWith('/') 
              ? url.pathname + 'index.html'
              : url.pathname + '/index.html';
            
            return caches.match(pathWithIndex)
              .catch(() => caches.match('./index.html'));
          });
        })
    );
  } 
  // Chiến lược Network-first cho HTML, JS, CSS
  else if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('📦 Phục vụ từ cache:', request.url);
              return cachedResponse;
            }

            return new Response('Offline - Không thể tải tài nguyên này', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain; charset=utf-8'
              })
            });
          });
        })
    );
  } else {
    // Chiến lược Cache-first cho các tài nguyên khác (fonts, images, etc)
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          return new Response('Offline');
        });
      })
    );
  }
});
