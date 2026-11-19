import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  webpack(config, { dir }) {
    // Resolve the source alias explicitly for production webpack builds.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(dir, "src"),
    };
    return config;
  },
  experimental: {
    // Limit page-data collection and static generation workers on Hostinger.
    cpus: 1,
    // Render one page at a time within the static generation worker.
    staticGenerationMaxConcurrency: 1,
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};

export default nextConfig;
