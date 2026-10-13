import type { UserRole } from "@/types/user";

/**
 * Returns `target` only if it is a same-origin relative path; otherwise `fallback`.
 * Blocks open redirects such as `//evil.com`, `/\evil.com`, `https://evil.com`
 * and `javascript:` URLs.
 */
export function safeRedirect(target: string | null | undefined, fallback: string): string {
  if (!target) return fallback;
  if (!target.startsWith("/")) return fallback;
  if (target.startsWith("//") || target.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(target)) return fallback;
  return target;
}

/** Default landing page for each role. */
export function routeForRole(role: UserRole): string {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "BUSINESS_OWNER") return "/owner";
  return "/products";
}

/** Which role may use a protected path prefix (undefined = any signed-in user). */
export function requiredRoleForPath(pathname: string): UserRole | undefined {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "SUPER_ADMIN";
  if (pathname === "/owner" || pathname.startsWith("/owner/")) return "BUSINESS_OWNER";
  if (pathname === "/account" || pathname.startsWith("/account/")) return "CONSUMER";
  return undefined;
}
