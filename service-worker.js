const CACHE_NAME = 'c7aio-v3.3.3-fix';
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
  './script/nk.js'
];

// Cài đặt Service Worker và lưu trữ tài nguyên
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Kích hoạt SW và dọn dẹp các cache cũ không dùng nữa
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Chiến lược Network First, fallback về Cache khi mất mạng
self.addEventListener('fetch', (event) => {
  // Chỉ cache các request HTTP/HTTPS cơ bản (bỏ qua Firebase realtime websocket hoặc chrome-extension)
  if (event.request.url.startsWith('http') && !event.request.url.includes('firebasedatabase.app')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Lưu bản sao vào cache nếu response hợp lệ
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Khi offline, trả về dữ liệu từ cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
        })
    );
  }
});
