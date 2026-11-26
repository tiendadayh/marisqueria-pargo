/* GastroPOS · Service Worker
   Objetivo: que la app ABRA sin internet (admin, mesero, cocina, cliente y para llevar).
   - La página y sus archivos se guardan al visitarlos con internet.
   - Las librerías externas (Tailwind, Font Awesome, Firebase, QR, PDF, fuentes) también se guardan,
     porque sin ellas la página abre sin estilos o sin funciones.
   - Los datos (Firestore) NO se guardan aquí: la propia app los guarda en el dispositivo. */
const VERSION = 'gastropos-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png'];
const LIBS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@600;700;800&family=Archivo:wght@700;800;900&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap'
];
const LIB_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map((u) => c.add(u).catch(() => {})));
    await Promise.all(LIBS.map((u) => c.add(new Request(u, { mode: 'no-cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isLib(url) {
  if (LIB_HOSTS.indexOf(url.hostname) >= 0) return true;
  return url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0; // no el "generate_204" del aviso de conexión
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Página (incluye ?mesa=..., ?vista=cocina, ?vista=mesero, ?vista=llevar): primero internet, si no hay, la guardada
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        // Si ya hay copia guardada y el internet no responde en 4.5 s (Wi-Fi sin internet), abre la guardada
        const saved = await c.match('./index.html', { ignoreSearch: true });
        const net = saved
          ? await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 4500))])
          : await fetch(req);
        if (net && net.ok) c.put('./index.html', net.clone()).catch(() => {});
        return net;
      } catch (err) {
        return (await c.match('./index.html', { ignoreSearch: true })) || (await c.match('./', { ignoreSearch: true })) ||
          new Response('Sin internet y la app aún no se guardó en este dispositivo. Ábrela una vez con internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  // Librerías externas y archivos propios: lo guardado primero, y se actualiza en segundo plano
  if (isLib(url) || url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await c.match(req, { ignoreSearch: url.origin === location.origin });
      const refresh = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => null);
      if (hit) { e.waitUntil(refresh); return hit; }
      const r = await refresh;
      return r || new Response('', { status: 504 });
    })());
  }
  // Todo lo demás (Firestore, avisos de conexión, etc.) pasa directo a internet
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) return all[0].focus();
    return self.clients.openWindow('./');
  })());
});
