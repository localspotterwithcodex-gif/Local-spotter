import type { NextConfig } from "next";

/**
 * The browser only ever talks to its own origin (`/api/v1/*`). Next proxies
 * those calls to the NestJS API, so the HttpOnly session cookie issued by the
 * backend is a first-party cookie (no cross-site cookie / CORS-credentials
 * problems on Vercel + Render). BACKEND_URL is server-side only.
 */
function resolveBackendUrl(): string {
  // Tolerate common dashboard typos: quotes, spaces, missing scheme,
  // trailing slash, or an accidental "/api/v1" suffix.
  let raw = (process.env.BACKEND_URL ?? "").trim().replace(/^["']|["']$/g, "").trim();
  if (!raw) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      throw new Error(
        "BACKEND_URL is not set. Set it to the backend base URL, e.g. https://your-service.onrender.com",
      );
    }
    raw = "http://localhost:4000";
  }
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  return raw.replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
}

const BACKEND_URL = resolveBackendUrl();

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
