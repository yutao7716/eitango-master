// えいたんごマスター Service Worker
const CACHE_NAME = 'eitango-v2';

// キャッシュするリソース（初回インストール時）
const PRECACHE_URLS = [
  './',
  './index.html',
  './words/grade-1.json',
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

// HTMLドキュメントへのリクエストか判定（ナビゲーション or .html）
function isHtmlRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) return true;
  return new URL(request.url).pathname.endsWith('.html');
}

// ── フェッチ ──
self.addEventListener('fetch', event => {
  // GETリクエストのみ対象
  if (event.request.method !== 'GET') return;

  // HTML（index.html等）はネットワーク優先：更新を即反映、オフライン時のみキャッシュ
  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  // その他リソース（単語データ等）はキャッシュ優先（オフライン対応）
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
