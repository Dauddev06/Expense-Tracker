// Service worker: a small script the browser keeps running for the installed app.
// It does ONE thing: if you open a page while you have no internet, it shows
// a friendly "You're offline" page instead of the browser's error.
// It never stores your money data - every page always comes fresh from the server.

const CACHE = "hisaab-v1";
const OFFLINE_URL = "/offline.html";

// On install: save the offline page (and its icon) so it works without internet
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])),
  );
  self.skipWaiting();
});

// On activate: delete caches from older versions of this file
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Page loads: try the network first; only when that fails, show the offline page
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // The icon on the offline page: from the cache, so it shows without internet
  if (new URL(event.request.url).pathname === "/icons/icon-192.png") {
    event.respondWith(caches.match(event.request).then((saved) => saved || fetch(event.request)));
  }
  // Everything else (API calls, scripts...) is left alone and goes to the network
});
