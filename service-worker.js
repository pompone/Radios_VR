// --- service-worker.js ---

// Subí este número cuando hagas cambios importantes
const CACHE_NAME = 'radios-vr-v17';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icono.ico',
  './icon-192.png',
  './icon-512.png'
  // Agregá acá screenshot-wide.png o fonts si las usás
];

// -------------------- INSTALL --------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// -------------------- ACTIVATE --------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borrar cachés viejas
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) =>
          k === CACHE_NAME ? Promise.resolve() : caches.delete(k)
        )
      );

      // Tomar control de las pestañas abiertas
      await self.clients.claim();

      //  Forzar recarga de las ventanas para que usen la nueva versión
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

// -------------------- FETCH --------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  // 1) No cachear audio (streams / mp3)
  if (
    url.includes('.mp3') ||
    url.includes('stream') ||
    req.destination === 'audio'
  ) {
    // Dejo que vaya directo a la red
    return;
  }

  // 2) Solo cacheamos GET
  if (req.method !== 'GET') return;

  // 3) Para navegación (HTML / index): estrategia "network first"
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Si la red responde bien, guardamos copia fresca
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          // Si no hay red, devolvemos la versión cacheada
          return caches.match('./index.html');
        })
    );
    return;
  }

  // 4) Para CSS, JS, iconos, etc.: "cache first"
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Respuesta válida
          if (!res || res.status !== 200 || res.type !== 'basic') {
            return res;
          }

          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          // Si no hay red ni caché, al menos devolvemos el index
          return caches.match('./index.html');
        });
    })
  );
});



