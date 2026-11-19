import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // Client cache for pages already visited: going back to a section within 30 s shows it at once, with no new
    // server round trip. Forms post to /api and reload the page, and AutoRefresh calls router.refresh(), so neither
    // ever shows a stale copy.
    staleTimes: { dynamic: 30 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
