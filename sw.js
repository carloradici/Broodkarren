// Broodkarren: werkt ook zonder internet. Verhoog VERSIE bij elke nieuwe versie.
const VERSIE = 'broodkarren-4.1';
const BESTANDEN = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Eerst online proberen (altijd nieuwste versie), anders de opgeslagen versie
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => { const k = r.clone(); caches.open(VERSIE).then(c => c.put(e.request, k)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
