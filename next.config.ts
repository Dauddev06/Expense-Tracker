import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js NOT to bundle TypeORM. Load it with plain Node.js `require` instead.
  serverExternalPackages: ["typeorm"],
  experimental: {
    // TypeORM identifies entities by their class names. Minifying the build
    // renames classes (`User` -> `s`), which breaks TypeORM in production.
    turbopackMinify: false,
  },
  // The service worker must never be cached by the browser, otherwise an
  // installed app could keep running an old version of it.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
