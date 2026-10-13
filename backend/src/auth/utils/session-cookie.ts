import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'ls_session';

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** HttpOnly + SameSite=Lax (+ Secure in production) session cookie options. */
export function sessionCookieOptions(maxAgeMs: number, secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: maxAgeMs };
}
