import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies Facebook's `signed_request` (HMAC-SHA256 with the app secret) and
 * returns the Facebook user id, or null when the signature or payload is invalid.
 */
export function parseFacebookSignedRequest(signedRequest: unknown, appSecret: string): { userId: string } | null {
  if (typeof signedRequest !== 'string' || !appSecret) return null;
  const [encodedSig, payload, ...rest] = signedRequest.split('.');
  if (!encodedSig || !payload || rest.length) return null;
  try {
    const expected = createHmac('sha256', appSecret).update(payload).digest();
    const given = Buffer.from(encodedSig, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { algorithm?: string; user_id?: unknown };
    if (String(data.algorithm).toUpperCase() !== 'HMAC-SHA256') return null;
    if (typeof data.user_id !== 'string' || !data.user_id) return null;
    return { userId: data.user_id };
  } catch {
    return null;
  }
}
