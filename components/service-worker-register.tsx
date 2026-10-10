"use client";

import { useEffect } from "react";

// Registers public/sw.js once the page has loaded. Only in production:
// in development a service worker can get in the way of hot reloading.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);
  return null;
}
