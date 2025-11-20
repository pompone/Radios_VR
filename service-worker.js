// --- service-worker.js ---
const CACHE_NAME = 'radios-vr-v16'; // Subimos versión para limpiar caché vieja
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icono.ico',
  './icon-192.png',
  './icon-512.png'
  // Agrega aquí screenshot-wide.png o fonts si las tienes
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
  // 1. IMPORTANTE: Si es audio, NO cachear. Pasar directo a red.
  if (event.request.url.includes('.mp3') || 
      event.request.url.includes('stream') || 
      event.request.destination === 'audio') {
    return; 
  }

  // 2. Si no es GET, no cachear
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((res) => {
        // Chequear respuesta válida
        if (!res || res.status !== 200 || res.type !== 'basic') {
          return res;
        }
        // Clonar y guardar
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        return res;
      }).catch(() => {
        // Si falla red y no hay caché, devolver index (modo offline)
        return caches.match('./index.html');
      });
    })
  );
});


