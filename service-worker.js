const CACHE_NAME = 'c7aio-v1.0.0'; // Thay đổi version này để force update cache
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/lich/lich.html',
  '/nhiemvu/nv.html',
  '/thongbao/tb.html',
  '/thongke/tk.html',
  '/style/hub.css',
  '/style/lich.css',
  '/style/nv.css',
  '/style/tb.css',
  '/style/tk.css',
  '/script/hub.js',
  '/script/lich.js',
  '/script/nv.js',
  '/script/tb.js',
  '/script/tk.js',
  '/manifest.json'
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

  // Chiến lược Network-first cho HTML, JS, CSS (luôn thử mạng trước)
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Lưu bản copy vào cache nếu response OK
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
          // Nếu mạng lỗi, dùng cache
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log('📦 Phục vụ từ cache:', request.url);
              return cachedResponse;
            }

            // Fallback cho trang
            if (request.destination === 'document') {
              return caches.match('/index.html');
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
