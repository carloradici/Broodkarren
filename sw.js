// Brood Opzet: werkt ook zonder internet. Verhoog VERSIE bij elke nieuwe versie.
const VERSIE = 'broodopzet-8.7';
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
const BESTANDEN = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', SUPA_JS];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Alleen de app zelf en de Supabase-bibliotheek bewaren; verkeer naar de database gaat altijd rechtstreeks.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin && url.href !== SUPA_JS) return;
  e.respondWith(
    fetch(e.request).then(r => { const k = r.clone(); caches.open(VERSIE).then(c => c.put(e.request, k)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
