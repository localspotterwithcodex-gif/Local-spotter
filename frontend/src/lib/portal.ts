/**
 * Which deployment this is (MASTER-PROMPT Phase 9): the same frontend code runs as two Vercel projects.
 *  - "public" (www): consumers and shop owners; /admin does not exist here.
 *  - "admin"  (admin.<domain>): super admins only; serves /admin and the sign-in pages, nothing else.
 */
export type Portal = "public" | "admin";

export const portalFromEnv = (value: string | undefined): Portal => (value === "admin" ? "admin" : "public");

const ADMIN_PORTAL_PATHS = ["/admin", "/login", "/forgot-password", "/reset-password"];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** What the proxy does with a page request (static files and /api are let through before this). */
export function portalDecision(portal: Portal, pathname: string): "continue" | "not-found" | { redirect: string } {
  if (portal === "admin") {
    if (pathname === "/") return { redirect: "/admin" };
    return ADMIN_PORTAL_PATHS.some((p) => under(pathname, p)) ? "continue" : "not-found";
  }
  return under(pathname, "/admin") ? "not-found" : "continue";
}
