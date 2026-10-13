import type { NextConfig } from "next";

/**
 * The browser only ever talks to its own origin (`/api/v1/*`). Next proxies
 * those calls to the NestJS API, so the HttpOnly session cookie issued by the
 * backend is a first-party cookie (no cross-site cookie / CORS-credentials
 * problems on Vercel + Render). BACKEND_URL is server-side only.
 */
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
    ],
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
