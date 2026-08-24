// FigForge Service Worker
// v2026.08.23 — network-first SEMPRE para arquivos do app
var CACHE_NAME = 'figforge-v2026-08-23';

// Só cacheia a biblioteca PDF (pesada e raramente muda)
var urlsToCache = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalação
self.addEventListener('install', function(event) {
  self.skipWaiting(); // Ativa imediatamente sem esperar fechar as abas
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache).catch(function(){});
    })
  );
});

// Ativação — apaga TODOS os caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) {
          // Apaga qualquer cache que não seja o atual
          if(name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(function() {
      // Assume controle de todas as abas abertas imediatamente
      return self.clients.claim();
    })
  );
});

// Fetch
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Nunca intercepta chamadas ao servidor/APIs externas
  if(url.includes('script.google.com') ||
     url.includes('api.imgbb.com') ||
     url.includes('wa.me') ||
     url.includes('googleapis.com')) {
    return; // Deixa o browser lidar normalmente
  }

  // ARQUIVOS DO APP (HTML, SW, manifest): SEMPRE busca na rede
  // Garante que toda atualização publicada no GitHub chegue imediatamente
  var isAppFile = event.request.mode === 'navigate' ||
                  url.endsWith('.html') ||
                  url.endsWith('/figforge/') ||
                  url.endsWith('/figforge') ||
                  url.endsWith('sw.js') ||
                  url.endsWith('manifest.json');

  if(isAppFile) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(function(response) {
          return response;
        })
        .catch(function() {
          // Sem internet: usa cache se existir
          return caches.match(event.request);
        })
    );
    return;
  }

  // BIBLIOTECAS EXTERNAS (CDN): cache-first — já são fixas
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
