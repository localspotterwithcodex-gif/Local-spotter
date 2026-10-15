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

/**
 * HttpOnly + SameSite=Lax (+ Secure in production) session cookie options.
 * Without maxAge this is a browser-session cookie: closing the browser ends the
 * session, so opening the site again always starts at the login page. The JWT's
 * own `exp` remains the hard upper limit.
 */
export function sessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' };
}
