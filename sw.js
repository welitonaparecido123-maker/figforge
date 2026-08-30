// FigForge Service Worker
// v2026.08.30 — network-first para tudo do app
var CACHE_NAME = 'figforge-v2026-08-30';

var urlsToCache = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache).catch(function(){});
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) {
          if(name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Nunca intercepta APIs externas
  if(url.includes('script.google.com') ||
     url.includes('supabase.co') ||
     url.includes('viacep.com') ||
     url.includes('wa.me') ||
     url.includes('infinitepay') ||
     url.includes('googleapis.com')) {
    return;
  }

  // TODOS os arquivos HTML e do app: SEMPRE da rede (nunca do cache)
  var isAppFile = event.request.mode === 'navigate' ||
                  url.endsWith('.html') ||
                  url.endsWith('/figforge/') ||
                  url.endsWith('/figforge') ||
                  url.endsWith('sw.js') ||
                  url.endsWith('manifest.json') ||
                  url.includes('pedidos') ||
                  url.includes('index');

  if(isAppFile) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
        .then(function(response) {
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Bibliotecas CDN: cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if(cached) return cached;
      return fetch(event.request).then(function(response) {
        if(!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
