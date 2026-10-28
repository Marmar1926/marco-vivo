// Marco Vivo: guarda la app y las últimas fotos vistas para que siga andando sin Wi-Fi.
const SHELL = "marco-shell-v1", DATA = "marco-data-v1", MAX_FOTOS = 400;
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "fonts/DejaVuSans.ttf", "icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(ARCHIVOS.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function recortar() {
  const c = await caches.open(DATA), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_FOTOS; i++) await c.delete(ks[i]);
}
async function primeroRed(req, cache) {
  const c = await caches.open(cache);
  try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
  catch (err) { const m = await c.match(req, { ignoreSearch: true }); if (m) return m; throw err; }
}
async function primeroCache(req) {
  const c = await caches.open(DATA), m = await c.match(req);
  if (m) return m;
  const r = await fetch(req);
  if (r.ok) { c.put(req, r.clone()).then(recortar).catch(() => {}); }
  return r;
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const p = url.pathname;
  if (p.endsWith(".mp4")) return;                                    // videos: siempre de la red
  if (/\/data\/(manifest\.bin|config\.json)$/.test(p)) { e.respondWith(primeroRed(req, DATA)); return; }
  if (/\/data\/[^/]+\.bin$/.test(p)) { e.respondWith(primeroCache(req)); return; }   // fotos cifradas: no cambian
  e.respondWith(primeroRed(req, SHELL));                              // la app: la versión más nueva si hay red
});
