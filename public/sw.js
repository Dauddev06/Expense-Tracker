// This app is no longer installable, so it no longer needs a service worker.
// Phones that installed it earlier still have the OLD one running. Browsers
// check this file for updates, find this version, and run it once: it deletes
// the old caches and unregisters itself. After that nothing is left behind.
// (Safe to delete this file in a few months, once old installs have updated.)

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister()),
  );
});
