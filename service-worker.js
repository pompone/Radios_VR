const CACHE_NAME = 'radios-vr-v1';
const urlsToCache = [
  '/Radios_VR/',
  '/Radios_VR/index.html',
  '/Radios_VR/style.css',
  '/Radios_VR/script.js',
  '/Radios_VR/manifest.json',
  '/Radios_VR/icono.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});
