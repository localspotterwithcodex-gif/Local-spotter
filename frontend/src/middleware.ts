import { NextRequest, NextResponse } from "next/server";
import { requiredRoleForPath, routeForRole } from "@/lib/auth/redirect";
import type { UserRole } from "@/types/user";

/**
 * Route guard. Protected areas (owner/admin/account/cart/checkout/onboarding)
 * need a session; /owner, /admin and /account additionally need the matching
 * role. The session is the HttpOnly `ls_session` cookie issued by the backend.
 *
 * IMPORTANT: this runs at the edge and only *reads* the JWT claims (role, exp)
 * to route the user without a flash of the wrong portal. It does NOT verify the
 * signature — the backend (JwtAuthGuard + RolesGuard + ownership checks on every
 * endpoint) is the real authorization boundary. A forged cookie gets a page
 * shell at best and 401/403 from every API call.
 */
const SESSION_COOKIE = "ls_session";
const GUEST_COOKIE = "ls_guest";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/products",
  "/businesses",
  "/shoproutes",
  "/workshops",
  "/terms",
  "/privacy-policy",
  "/data-deletion",
  "/help",
];

const AUTH_PAGES = ["/login", "/signup"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function readClaims(token: string | undefined): { role: UserRole; exp?: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { role?: UserRole; exp?: number };
    if (!claims.role) return null;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return { role: claims.role, exp: claims.exp };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const claims = readClaims(request.cookies.get(SESSION_COOKIE)?.value);

  // Signed-in users have no business on the login/signup pages.
  if (claims && matches(pathname, AUTH_PAGES)) {
    return NextResponse.redirect(new URL(routeForRole(claims.role), request.url));
  }

  // The site opens on the login page; signed-in users go straight on, guests
  // opt in explicitly ("Continue as guest" sets the ls_guest cookie).
  if (pathname === "/" && !claims && !request.cookies.get(GUEST_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/" || matches(pathname, PUBLIC_PATHS)) return NextResponse.next();

  if (!claims) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    const res = NextResponse.redirect(loginUrl);
    // Drop an expired/garbage cookie so the browser stops sending it.
    if (request.cookies.get(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const required = requiredRoleForPath(pathname);
  if (required && claims.role !== required) {
    return NextResponse.redirect(new URL(routeForRole(claims.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
