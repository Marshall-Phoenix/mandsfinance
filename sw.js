// Network first, cache as a fallback, so the site opens offline but always picks up updates when online.
const CACHE = "ms-money-v4";
const SHELL = ["./", "index.html", "style.css", "app.js", "config.js", "demo.js", "organic.js", "firebase.js", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-512.png", "fonts/bsd-700.woff2", "fonts/bsd-800.woff2", "fonts/bsd-900.woff2", "fonts/is-400.woff2", "fonts/is-500.woff2", "fonts/is-600.woff2", "fonts/is-700.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
