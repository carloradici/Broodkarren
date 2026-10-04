// Brood Opzet: werkt ook zonder internet. Verhoog VERSIE bij elke nieuwe versie.
const VERSIE = 'broodopzet-9.6';
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
// Pushmeldingen (bijv. materiaal bijna op)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { tekst: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.titel || 'Brood Opzet', {
    body: d.tekst || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: d.tag || 'brood-opzet', data: { url: d.url || './#materiaal' }
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
