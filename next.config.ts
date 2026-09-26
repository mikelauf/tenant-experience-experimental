import type { NextConfig } from "next";

/** See lib/flags.ts: the same code builds the demo (default) or the production public venue site. */
const production = process.env.NEXT_PUBLIC_SITE_MODE === "production";

// Carried over from Tenant Experience's next.config.mjs.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
  // Indexing is opt-in: only a launched production site sets SITE_INDEXABLE=1.
  ...(production && process.env.SITE_INDEXABLE === "1" ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    qualities: [75, 85, 90],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    // In production the venue site is the whole site, so it answers at the root.
    return production ? { beforeFiles: [{ source: "/", destination: "/venues" }], afterFiles: [], fallback: [] } : [];
  },
  async redirects() {
    // Old Tenant Experience URLs on the same domain keep working.
    return production ? [{ source: "/spaces/:slug", destination: "/venues/:slug", permanent: true }] : [];
  },
};

export default nextConfig;
