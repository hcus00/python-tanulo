/* Service worker: offline használat.
 * - Az oldal saját fájljai (HTML, CSS, JS): hálózat először, ha nincs net, a gyorsítótárból jön. Így a frissítés
 *   automatikusan megjelenik, nem kell verziószámot emelni.
 * - A Pyodide fájljai (több MB): gyorsítótár először, mert nem változnak. Az első futtatáskor töltődnek le. */
var APP = "pyt-app";
var PYC = "pyt-pyodide";
var SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/style.css",
  "js/util.js", "js/flowchart.js", "js/hibak.js", "js/runner.js",
  "js/data/grade9.js", "js/data/grade10.js", "js/data/grade11.js", "js/data/erettsegi.js",
  "js/exam.js", "js/app.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(APP).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== APP && k !== PYC; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isPyodide(u) { return /\/pyodide(@[\w.]+)?\//.test(u.pathname); }

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (isPyodide(u)) {
    e.respondWith(caches.open(PYC).then(function (c) {
      return c.match(u.href).then(function (hit) {
        if (hit) return hit;
        /* CORS-módban kérjük le, hogy a <script> és a fetch() is ugyanazt a választ kapja */
        return fetch(u.href, { mode: "cors", credentials: "omit" }).then(function (r) {
          if (r.ok) c.put(u.href, r.clone());
          return r;
        });
      });
    }));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(APP).then(function (c) { c.put(req, cp); }); }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
    });
  }));
});
