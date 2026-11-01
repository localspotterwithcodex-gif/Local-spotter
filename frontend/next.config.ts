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
const isDev = process.env.NODE_ENV !== "production";

// Every third-party origin the browser talks to: Google sign-in, Cloudinary (images, video,
// direct video upload), Unsplash images, OpenStreetMap (map iframes, address search).
// shortcut: 'unsafe-inline' scripts because Next's inline bootstrap has no nonce here; move to nonces via middleware if XSS risk grows.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://accounts.google.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.unsplash.com https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' https://api.cloudinary.com https://nominatim.openstreetmap.org https://accounts.google.com${isDev ? " ws:" : ""}`,
  "media-src 'self' blob: https://res.cloudinary.com",
  "frame-src https://www.openstreetmap.org https://accounts.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Photo upload uses the camera, voice search the microphone, "near me" the location; nothing else.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

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
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
