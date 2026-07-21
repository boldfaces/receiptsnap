const CACHE = 'receiptsnap-v8';
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

  // Same-origin app shell: cache-first
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
      ).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Static libraries and fonts from known CDNs: cache-first so the app shell
  // (jsPDF, MSAL, fonts) works offline after first load. Never touches
  // Graph, Anthropic, or Microsoft auth endpoints.
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
