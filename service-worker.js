const CACHE_NAME = 'c7aio-v1';
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
      console.log('Caching assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('Lỗi khi cache một số assets, tiếp tục...', err);
        // Vẫn tiếp tục ngay cả nếu một vài asset không thể cache
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('Xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;

  // Bỏ qua các request không phải GET
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Phục vụ từ cache
        return cachedResponse;
      }

      // Nếu không có trong cache, tìm từ mạng
      return fetch(request).then(networkResponse => {
        // Không lưu cache cho các request từ bên ngoài
        if (!networkResponse || networkResponse.status !== 200 || request.url.includes('fonts.googleapis')) {
          return networkResponse;
        }

        // Lưu bản sao vào cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Khi offline và không có trong cache, trả về trang offline
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('Offline - Không thể tải tài nguyên này', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});
