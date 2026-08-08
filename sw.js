const CACHE = 'receiptsnap-v13';
const LIBS = 'receiptsnap-libs';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'alcdn.msauth.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== LIBS).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (url.origin === location.origin) {
    // App shell (navigations): NETWORK-FIRST with 3s offline fallback,
    // so an installed PWA always picks up the latest deployed build.
    if (e.request.mode === 'navigate' || e.request.destination === 'document') {
      e.respondWith((async () => {
        try {
          const net = await Promise.race([
            fetch(e.request),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
          ]);
          const c = await caches.open(CACHE);
          c.put('index.html', net.clone());
          return net;
        } catch (err) {
          return (await caches.match(e.request)) || caches.match('index.html');
        }
      })());
      return;
    }
    // Static same-origin assets (icons, manifest): cache-first
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
      )
    );
    return;
  }

  // CDN libraries and fonts: cache-first for offline capability
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(LIBS).then(c => c.put(e.request, copy));
          }
          return res;
        })
      )
    );
  }
});
