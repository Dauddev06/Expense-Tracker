import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js NOT to bundle TypeORM. Load it with plain Node.js `require` instead.
  serverExternalPackages: ["typeorm"],
  experimental: {
    // TypeORM identifies entities by their class names. Minifying the build
    // renames classes (`User` -> `s`), which breaks TypeORM in production.
    turbopackMinify: false,
  },
};

export default nextConfig;
