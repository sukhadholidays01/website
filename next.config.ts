import type { NextConfig } from "next";
import path from "node:path";

// NEXT_PUBLIC values are embedded at build time: reject secrets before bundling.
if (process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN && !/^pk\.[A-Za-z0-9._-]+$/.test(process.env.NEXT_PUBLIC_CAB_MAPBOX_TOKEN)) {
  throw new Error("NEXT_PUBLIC_CAB_MAPBOX_TOKEN must be a public pk. Mapbox token, never a secret token.");
}

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
    ] }, { source: "/cabs/driver", headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }] }];
  },
};

export default nextConfig;
