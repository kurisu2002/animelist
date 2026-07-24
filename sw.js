// Service Worker - 离线缓存支持
const CACHE_NAME = 'anime-tracker-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './supabase.min.js',
];

// 安装：预缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 激活：清理所有旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => caches.delete(key)));
    })
  );
  self.clients.claim();
});

// 拦截请求：网络优先（因为本地服务器很快）
self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('unpkg.com')) return;
  if (event.request.url.includes('jsdelivr.net')) return;

  event.respondWith(
    fetch(event.request).then(response => {
      if (event.request.method === 'GET' && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
