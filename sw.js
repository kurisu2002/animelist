// Service Worker - 离线缓存支持
const CACHE_NAME = 'anime-tracker-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './supabase.min.js',
];

// 静态资源扩展名（Cache-First 策略）
const STATIC_EXT = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|json)$/i;

// 安装：预缓存核心静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 激活：清理所有旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(key => key.startsWith('anime-tracker-')).map(key => caches.delete(key)));
    })
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 跳过 Supabase API / 第三方 CDN
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('unpkg.com')) return;
  if (url.hostname.includes('jsdelivr.net')) return;
  if (url.hostname.includes('graphql.anilist.co')) return;

  // 只处理 GET
  if (event.request.method !== 'GET') return;

  // 静态资源：缓存优先（快 + 离线可用）
  if (STATIC_EXT.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        // 后台更新缓存
        const fetchAndCache = fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => null);

        return cached || fetchAndCache;
      })
    );
    return;
  }

  // 其他请求（API 代理等）：网络优先 + 缓存兜底
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
