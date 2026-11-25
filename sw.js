/* Service worker · Marisquería PARGO POS
   Sube el número de VERSION cada vez que cambies archivos de la app para que los teléfonos se actualicen. */
const VERSION = 'v1';
const CACHE = 'pargo-pos-' + VERSION;

const LOCAL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png'];
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

// Nunca interceptar la sincronización en vivo ni enlaces externos
const BYPASS_HOSTS = ['firestore.googleapis.com', 'firebaseinstallations.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'wa.me', 'api.whatsapp.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Archivos propios: si falta alguno, que se note
    await Promise.all(LOCAL.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    // Librerías externas: una por una, para que un fallo no cancele todo
    await Promise.all(CDN.map(async (u) => {
      try { await cache.put(u, await fetch(new Request(u, { mode: 'no-cors' }))); } catch (e) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('pargo-pos-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (BYPASS_HOSTS.includes(url.hostname)) return;
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return;

  // Página principal (incluye ?mesa=, ?vista=): red primero, caché si no hay internet
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const fresh = await fetch(req, { signal: ctrl.signal });
        clearTimeout(t);
        if (fresh && fresh.ok) cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match('./index.html', { ignoreSearch: true })) ||
               (await cache.match('./', { ignoreSearch: true })) ||
               new Response('Sin conexión y la app aún no se guardó. Ábrela una vez con internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // Resto (propio y librerías/fuentes): caché primero y se actualiza en segundo plano
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const refresh = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await refresh) || new Response('', { status: 504 });
  })());
});
