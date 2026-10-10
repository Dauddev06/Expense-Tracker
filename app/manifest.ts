import type { MetadataRoute } from "next";

// The "web app manifest": tells phones and browsers how to install this site
// as an app - its name, its home-screen icon, and that it should open
// full-screen (no browser address bar). Next.js serves it at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pocket Manager",
    short_name: "Pocket Manager", // shown under the home-screen icon, where space is short
    description: "Track your balances, bills, income, loans and Sadqa.",
    start_url: "/home", // the Dashboard (goes to the login page if you're logged out)
    scope: "/",
    display: "standalone", // opens like a normal app, without the browser bar
    orientation: "portrait",
    background_color: "#f8fafc", // splash screen colour while the app starts
    theme_color: "#4f46e5", // colour of the phone's status bar
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // "maskable": the phone may crop this one into a circle or squircle
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
