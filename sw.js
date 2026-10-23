/* 보금 — 네트워크 우선 앱 셸 캐시 (오프라인일 때만 캐시 사용). 셸 파일을 바꾸면 CACHE 버전을 올린다. */
const CACHE = 'bogeum-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/config.js', 'js/data.js', 'js/engines.js', 'js/account.js', 'js/app.js', 'js/ai.js', 'icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
