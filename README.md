# Radios de Villa Regina – Instalación en móviles

Esta PWA puede instalarse en Android/iOS siempre que se cumplan los requisitos de los navegadores móviles:

## Requisitos imprescindibles
- **Servir la app desde HTTPS o localhost.** Los navegadores bloquean el registro del service worker y el botón de instalación en contextos inseguros. Si la sirves desde `http://`, Chrome/Edge/Firefox Mobile no ofrecerán "Añadir a pantalla de inicio" y el service worker fallará antes de instalarse.
- **Mantener `index.html` como inicio y el ámbito del manifiesto.** El `manifest.json` define `start_url` y `scope` en `./`, por lo que los archivos deben servirse desde la raíz (sin subcarpetas) para que el navegador detecte la app como instalable.
- **El service worker debe responder en la primera carga.** `script.js` registra `./service-worker.js`; si no se puede descargar (por ejemplo, por HTTPS ausente, ruta distinta o cabeceras erróneas), el navegador no mostrará el prompt de instalación.

## Pasos recomendados para publicar
1. **Sube el sitio a un hosting HTTPS** (GitHub Pages, Netlify, Vercel, etc.).
2. Coloca todos los archivos (`index.html`, `manifest.json`, `service-worker.js`, íconos) en la raíz pública del servidor.
3. Accede desde el móvil a la URL HTTPS. Verifica en las herramientas del navegador que el service worker se haya registrado correctamente.
4. Una vez que el navegador detecte el manifiesto y el service worker en HTTPS, debería aparecer la opción de instalación.

## Referencias de implementación
- El manifiesto define el `start_url`/`scope` y los íconos para el instalable.【F:manifest.json†L1-L36】
- `script.js` registra el service worker `./service-worker.js`; esto sólo funciona en contexto seguro (HTTPS/localhost).【F:script.js†L137-L166】
- El service worker cachea los recursos estáticos necesarios para el modo offline; si no puede registrarse, el navegador no permitirá instalar la PWA.【F:service-worker.js†L1-L49】
