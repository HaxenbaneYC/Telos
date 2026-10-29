/* Telos service worker: the app opens with no signal.
   The page is fetched fresh when there is a connection (so a new version arrives on its own) and
   falls back to the saved copy when there is not. Everything else is saved on first use.
   build.py puts the version in; a new build makes a new cache and the old one is deleted. */
var V = "__VERSION__";
var CORE = "telos-" + V, FONTS = "telos-fonts";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("telos-") === 0 && k !== CORE && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// A launch must not wait on the network: show the saved page now, fetch the new one for next time.
function pageFirst(e) {
  return caches.open(CORE).then(function (c) {
    return c.match("index.html").then(function (hit) {
      var net = fetch(e.request).then(function (res) { if (res && res.ok) c.put("index.html", res.clone()); return res; }, function () { return null; });
      if (hit) { e.waitUntil(net); return hit; }
      return net.then(function (res) { return res || Response.error(); });
    });
  });
}
function networkFirst(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function fromCache() { return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); }); }
    var timer = setTimeout(function () { fromCache().then(function (r) { if (r && !settled) { settled = true; resolve(r); } }); }, 3500);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) { var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); }
      if (!settled) { settled = true; resolve(res); }
    }, function () {
      clearTimeout(timer);
      fromCache().then(function (r) { if (!settled) { settled = true; resolve(r || Response.error()); } });
    });
  });
}
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }, function () { return hit; });
      return hit || net;
    });
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") { e.respondWith(staleWhileRevalidate(req, FONTS)); return; }
  if (u.origin !== self.location.origin) return;
  if (req.mode === "navigate" || /\.html?$/.test(u.pathname) || /\/$/.test(u.pathname)) { e.respondWith(pageFirst(e)); return; }
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); }
    return res;
  }); }));
});
