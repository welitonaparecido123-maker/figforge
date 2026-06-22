// FigForge Service Worker
// v2026.06.22 — ESTRATÉGIA CORRIGIDA: network-first para HTML (sempre busca versão nova)
var CACHE_NAME = 'figforge-v2026-06-22';
var urlsToCache = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalação — cacheia só os arquivos estáticos (NÃO o index.html)
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Ativação — limpa TODOS os caches antigos (de qualquer versão anterior)
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
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// Fetch — estratégia por tipo de requisição
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Nunca intercepta licença/sync/upload/whatsapp
  if(url.includes('script.google.com') ||
     url.includes('api.imgbb.com') ||
     url.includes('wa.me')) {
    return;
  }

  // Navegação e HTML/JS do próprio app: SEMPRE busca a rede primeiro (network-first)
  // Isso garante que toda atualização publicada no GitHub apareça imediatamente.
  var isAppFile = event.request.mode === 'navigate' ||
                   url.endsWith('.html') ||
                   url.endsWith('/figforge/') ||
                   url.endsWith('/figforge') ||
                   url.endsWith('sw.js') ||
                   url.endsWith('manifest.json');

  if(isAppFile){
    event.respondWith(
      fetch(event.request, {cache:'no-store'}).then(function(res){
        return res;
      }).catch(function(){
        // Só usa cache se estiver OFFLINE
        return caches.match(event.request);
      })
    );
    return;
  }

  // Bibliotecas externas (CDN): cache-first com atualização em background
  event.respondWith(
    caches.match(event.request).then(function(response) {
      if(response) return response;
      return fetch(event.request).then(function(res) {
        if(!res || res.status !== 200) return res;
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, resClone);
        });
        return res;
      });
    })
  );
});
