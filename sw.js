// Brood Opzet: werkt ook zonder internet. Verhoog VERSIE bij elke nieuwe versie.
const VERSIE = 'broodopzet-9.17';
const OCR_CACHE = 'broodopzet-ocr-1'; // leesprogramma voor pakbon scannen (blijft bewaard tussen versies)
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
const BESTANDEN = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', SUPA_JS];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSIE && k !== OCR_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Alleen de app zelf en de Supabase-bibliotheek bewaren; verkeer naar de database gaat altijd rechtstreeks.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin && url.href !== SUPA_JS) return;
  if (url.origin === location.origin && url.pathname.includes('/ocr/')) {
    e.respondWith(caches.open(OCR_CACHE).then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok) c.put(e.request, n.clone()); return n; }))));
    return;
  }
  // versiecontrole van de app: altijd vers van de server, niet bewaren
  if (url.searchParams.has('v')) { e.respondWith(fetch(e.request, { cache: 'no-store' })); return; }
  // de app zelf altijd eerst bij de server navragen (geen oude kopie uit de browsercache)
  const vers = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('sw.js');
  e.respondWith(
    (vers ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request)).then(r => { const k = r.clone(); caches.open(VERSIE).then(c => c.put(e.request, k)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
// Pushmeldingen (bijv. materiaal bijna op)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { tekst: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titel || 'Brood Opzet', {
    body: d.tekst || '', icon: 'icon-192.png', badge: 'badge-96.png', tag: d.tag || 'brood-opzet', data: { url: d.url || './#materiaal' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    for (const c of l) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
