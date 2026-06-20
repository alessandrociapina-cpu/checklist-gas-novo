/* Service worker — cache do app para funcionamento 100% offline */
'use strict';

const CACHE = 'checklist-gas-novo-v7';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/versao.js',
  './js/data.js',
  './js/db.js',
  './js/assinatura.js',
  './js/relatorio.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/sabesp-logo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache primeiro; rede como reserva (e atualização do cache quando online) */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(res =>
      res ||
      fetch(e.request).then(net => {
        if (net.ok && new URL(e.request.url).origin === location.origin) {
          const copia = net.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return net;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
