const CACHE_NAME = 'c7aio-v3.3.13-student-multi-roles';
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
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Ignore Firebase Realtime Database and external CDN calls
  const url = new URL(event.request.url);
  if (url.origin.includes('firebaseio.com') || 
      url.origin.includes('googleapis.com') ||
      url.origin.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
