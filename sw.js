// sw.js — Caledonia Private Network · minimální service worker
//
// Účel: SPLNIT PODMÍNKU pro nabídku "Nainstalovat aplikaci" v Chrome/Edge
// (bez zaregistrovaného service workeru instalaci prohlížeč nenabídne, i
// když je manifest.webmanifest v pořádku). Záměrně NEcachuje appku agresivně
// — obsah se mění často (ceny, sklad, účetnictví), takže "offline first"
// by uživatelům ukazoval zastaralá data. Cachuje se jen pár čistě statických
// souborů (logo, manifest), zbytek jde vždy na síť.

const CACHE_NAME = 'caledonia-shell-v1';
const SHELL_ASSETS = ['/logo.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first pro všechno — jen když je uživatel offline a síť selže,
// zkusí se vrátit alespoň to málo, co je v shell cache (logo/manifest).
// Stránky samotné (HTML, API) se NIKDY neservírují z cache, ať appka nikdy
// neukáže starou pokladnu/sklad jako aktuální stav.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
