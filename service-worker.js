// service-worker.js
const CACHE_NAME = 'radios-vr-v15'; // Cambié la versión para forzar actualización
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icono.ico',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. IMPORTANTE: Ignorar peticiones que no sean GET o que sean streams de audio
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('.mp3') || event.request.destination === 'audio') {
    return; // Dejar que pase directo a la red sin caché
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((res) => {
        // Verificamos que sea una respuesta válida antes de cachear
        if (!res || res.status !== 200 || res.type !== 'basic') {
          return res;
        }
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        return res;
      }).catch(() => {
        // Fallback offline si falla la red (opcional)
        return caches.match('./index.html');
      });
    })
  );
});


