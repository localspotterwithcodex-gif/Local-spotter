import { NextRequest, NextResponse } from "next/server";

/**
 * Route guard (PROMPT.md item 6): protected routes (owner/admin dashboards,
 * account, cart, checkout, onboarding) require authentication — opening one
 * while signed out redirects to /login first. This only checks presence of
 * a token — it cannot verify the JWT's signature/role at the edge without
 * calling the backend, so it is a UX convenience, NOT the real authorization
 * boundary. The real boundary is backend/src/common/guards/jwt-auth.guard.ts
 * (and a role guard) on every protected NestJS endpoint.
 *
 * The public catalog — Products, Local Shops (businesses), Shop Routes,
 * and Workshops — is intentionally excluded here. Every role (guest,
 * consumer, business owner, admin) can browse these without being bounced
 * to /login: the backend controllers for these GET endpoints (see
 * backend/src/{products,businesses,shoproutes,workshops}/*.controller.ts)
 * carry no `@UseGuards(JwtAuthGuard)` — they're public reads by design — so
 * gating them behind a login wall here was stricter than the API itself and
 * is what caused an already-authenticated owner/admin/consumer to be sent
 * back to /login when clicking Products/Local Shops/Shop Routes/Workshops
 * from any portal.
 */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/products",
  "/businesses",
  "/shoproutes",
  "/workshops",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|map)$/.test(pathname);

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("localspotter_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
