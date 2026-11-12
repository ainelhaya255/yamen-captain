/* Offline cache for "يامن ورؤى" — optional; index.html works without it. */
const CACHE = 'yamen-captain-v8';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const WAIT_MS = 2500;   // weak signal: give the network this long, then use the saved copy

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function saved(req){
  return (await caches.match(req, { ignoreSearch: true })) ||
         (req.mode === 'navigate' ? (await caches.match('./index.html')) || (await caches.match('./')) : undefined);
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const copy = await saved(req);
    // fresh copy from the network (skips the browser's HTTP cache so updates show at once)
    const net = fetch(req, { cache: 'no-store' }).then(r => {
      if (r && r.ok){ const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return r;
    });
    if (!copy) return net;                       // nothing saved yet: the network is the only option
    // no signal -> saved copy at once; weak signal -> saved copy after WAIT_MS; good signal -> newest version
    return Promise.race([
      net.then(r => (r && r.ok) ? r : copy, () => copy),
      new Promise(res => setTimeout(() => res(copy), WAIT_MS))
    ]);
  })());
});
