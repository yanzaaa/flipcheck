/* FlipCheck service worker — cache-first so the app works fully offline
   after the first load. Bump VERSION whenever index.html changes.
   prices.json is network-first so daily market prices actually refresh. */
const VERSION = 'flipcheck-v20';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './prices.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never touch bridge/IMEI-site requests

  if (url.pathname.endsWith('/prices.json')) {           // network-first: fresh prices when online
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./prices.json', copy));
        return res;
      }).catch(() => caches.match('./prices.json'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
