// FigForge Service Worker
var CACHE_NAME = 'figforge-v1';
var urlsToCache = [
  '/figforge/',
  '/figforge/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalação — faz cache dos arquivos principais
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Ativação — limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch — serve do cache, atualiza em background
self.addEventListener('fetch', function(event) {
  // Não intercepta requisições ao Google Apps Script (licença/sync)
  if(event.request.url.includes('script.google.com') ||
     event.request.url.includes('api.imgbb.com') ||
     event.request.url.includes('wa.me')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if(response) return response;
      return fetch(event.request).then(function(res) {
        if(!res || res.status !== 200 || res.type !== 'basic') return res;
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, resClone);
        });
        return res;
      });
    })
  );
});