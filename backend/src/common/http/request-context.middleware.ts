import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const INCOMING_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Per request: a request id (kept from X-Request-Id when well-formed, so it correlates with the
 * frontend/proxy, else generated), API security headers, and one JSON access-log line on finish.
 * The log has no query string, body, cookies or IPs, so no tokens or personal data end up in it.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && INCOMING_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  // JSON API: nothing may be framed, scripted or embedded from its responses (Swagger UI, dev only, needs its scripts).
  if (!req.path.includes('/docs')) res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0];
    if (path.endsWith('/health')) return;
    const line = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      msg: 'request',
      requestId: id,
      method: req.method,
      path,
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - start) / 1_000_000n),
    };
    process.stdout.write(`${JSON.stringify(line)}\n`);
  });
  next();
}
