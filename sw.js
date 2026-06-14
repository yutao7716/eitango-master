// えいたんごマスター Service Worker
const CACHE_NAME = 'eitango-v1';

// キャッシュするリソース（初回インストール時）
const PRECACHE_URLS = [
  './',
  './index.html',
  './words/grade-2.json',
  './words/grade-pre2.json',
  './words/grade-3.json',
  './words/grade-4.json',
  './words/grade-5.json',
];

// ── インストール：静的リソースを事前キャッシュ ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── アクティベート：古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── フェッチ：Cache First（オフライン対応） ──
self.addEventListener('fetch', event => {
  // GETリクエストのみ対象
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // キャッシュにない場合はネットワークから取得してキャッシュに保存
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      }).catch(() => {
        // オフラインかつキャッシュなし → index.html を返す（SPA フォールバック）
        return caches.match('./index.html');
      });
    })
  );
});
