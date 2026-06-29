/* Service worker — rede-primeiro com cache de reserva (atualiza sozinho quando
   online e continua funcionando 100% offline em campo). */
'use strict';

const CACHE = 'checklist-gas-novo-v15';
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
  './js/vendor/pdf.min.js',
  './js/vendor/pdf.worker.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/sabesp-logo.png'
];

const TIMEOUT_REDE = 3500; // se a rede demorar mais que isso, usa o cache

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

/* Reserva: resposta do cache (para navegações, cai no index.html) */
async function doCache(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }
  return Response.error();
}

/* Rede primeiro: tenta a rede (atualizando o cache); usa o cache se falhar ou demorar */
function redeComReserva(req) {
  return new Promise(resolve => {
    let pronto = false;
    const cair = () => { if (!pronto) { pronto = true; resolve(doCache(req)); } };

    fetch(req).then(net => {
      if (pronto) {                       // o cache já respondeu (timeout): só atualiza
        if (net && net.ok) caches.open(CACHE).then(c => c.put(req, net.clone())).catch(() => {});
        return;
      }
      pronto = true;
      if (net && net.ok) caches.open(CACHE).then(c => c.put(req, net.clone())).catch(() => {});
      resolve(net);
    }).catch(cair);

    setTimeout(cair, TIMEOUT_REDE);
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // só intercepta recursos da própria origem; deixa terceiros passarem direto
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(redeComReserva(req));
});
