import { ExecutionContext, ForbiddenException, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OriginCheckGuard } from './origin-check.guard';
import { RateLimit, RateLimitGuard } from './rate-limit.guard';
import { validateEnv } from '../../config/env.validation';
import { readCookie } from '../../auth/utils/session-cookie';

function ctx(req: Record<string, unknown>, handler: object = function handle() {}, res: Record<string, unknown> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => handler,
    getClass: () => class Dummy {},
  } as unknown as ExecutionContext;
}

describe('OriginCheckGuard (CSRF)', () => {
  const guard = new OriginCheckGuard({ get: () => 'https://app.localspotter.nl,http://localhost:3000' } as unknown as ConfigService);
  const withCookie = 'ls_session=abc; other=1';

  it('allows safe methods and requests without a session cookie', () => {
    expect(guard.canActivate(ctx({ method: 'GET', headers: { cookie: withCookie } }))).toBe(true);
    expect(guard.canActivate(ctx({ method: 'POST', headers: {} }))).toBe(true);
    expect(guard.canActivate(ctx({ method: 'POST', headers: { cookie: withCookie, authorization: 'Bearer x' } }))).toBe(true);
  });

  it('allows cookie-authenticated writes from an allowed origin', () => {
    expect(guard.canActivate(ctx({ method: 'POST', headers: { cookie: withCookie, origin: 'https://app.localspotter.nl' } }))).toBe(true);
    expect(guard.canActivate(ctx({ method: 'PATCH', headers: { cookie: withCookie, referer: 'http://localhost:3000/owner' } }))).toBe(true);
  });

  it('blocks cookie-authenticated writes from other or missing origins', () => {
    expect(() => guard.canActivate(ctx({ method: 'POST', headers: { cookie: withCookie, origin: 'https://evil.example' } }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx({ method: 'DELETE', headers: { cookie: withCookie } }))).toThrow(ForbiddenException);
  });
});

describe('RateLimitGuard', () => {
  class Limited {
    @RateLimit({ limit: 2, windowMs: 60_000, bodyKey: 'identifier' })
    login() {}
  }
  const handler = Limited.prototype.login;

  it('blocks after the limit per ip+identifier but not for another identifier, with Retry-After', async () => {
    const guard = new RateLimitGuard(new Reflector());
    const req = (identifier: string) => ({ ip: '1.2.3.4', body: { identifier } });
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => (headers[k] = v) };
    await expect(guard.canActivate(ctx(req('a'), handler, res))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(req('a'), handler, res))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(req('a'), handler, res))).rejects.toThrow(HttpException);
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
    await expect(guard.canActivate(ctx(req('b'), handler, res))).resolves.toBe(true);
  });

  it('counts signed-in callers per account, not per shared IP', async () => {
    const guard = new RateLimitGuard(new Reflector());
    const req = (id: string) => ({ ip: '10.0.0.1', body: { identifier: 'x' }, user: { id } });
    await guard.canActivate(ctx(req('u1'), handler));
    await guard.canActivate(ctx(req('u1'), handler));
    await expect(guard.canActivate(ctx(req('u1'), handler))).rejects.toThrow(HttpException);
    await expect(guard.canActivate(ctx(req('u2'), handler))).resolves.toBe(true);
  });

  it('uses the shared store (hashed keys) and falls back to memory when it fails', async () => {
    const counts = new Map<string, number>();
    const queryRaw = jest.fn((_s: TemplateStringsArray, key: string) => {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return Promise.resolve([{ count: counts.get(key), reset_at: new Date(Date.now() + 60_000) }]);
    });
    const shared = { $queryRaw: queryRaw, $executeRaw: jest.fn().mockResolvedValue(0) } as never;
    // Two instances sharing one store share the counter.
    const a = new RateLimitGuard(new Reflector(), shared);
    const b = new RateLimitGuard(new Reflector(), shared);
    const req = { ip: '5.6.7.8', body: { identifier: 'Someone@Example.com' } };
    await a.canActivate(ctx(req, handler));
    await b.canActivate(ctx(req, handler));
    await expect(a.canActivate(ctx(req, handler))).rejects.toThrow(HttpException);
    const storedKey = queryRaw.mock.calls[0][1];
    expect(storedKey).toMatch(/^[0-9a-f]{64}$/);
    expect(storedKey).not.toContain('someone');

    const broken = new RateLimitGuard(new Reflector(), { $queryRaw: jest.fn().mockRejectedValue(new Error('down')) } as never);
    await expect(broken.canActivate(ctx(req, handler))).resolves.toBe(true);
    await expect(broken.canActivate(ctx(req, handler))).resolves.toBe(true);
    await expect(broken.canActivate(ctx(req, handler))).rejects.toThrow(HttpException);
  });
});

describe('validateEnv', () => {
  const ok = { JWT_SECRET: 'a'.repeat(40), DATABASE_URL: 'postgresql://x' };
  it('accepts a strong secret', () => expect(validateEnv(ok)).toBe(ok));
  it('rejects a missing, short or placeholder JWT_SECRET without echoing it', () => {
    expect(() => validateEnv({ DATABASE_URL: 'x' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ ...ok, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() => validateEnv({ ...ok, JWT_SECRET: 'changeme'.repeat(6) })).toThrow(/placeholder/);
    try {
      validateEnv({ ...ok, JWT_SECRET: 'short-secret-value' });
    } catch (e) {
      expect((e as Error).message).not.toContain('short-secret-value');
    }
  });
  it('requires DATABASE_URL and, in production, CORS_ORIGIN and no dev mail transport', () => {
    expect(() => validateEnv({ JWT_SECRET: ok.JWT_SECRET })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...ok, NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN/);
    expect(() => validateEnv({ ...ok, NODE_ENV: 'production', CORS_ORIGIN: 'https://a', MAIL_TRANSPORT: 'dev-file' })).toThrow(/dev-file/);
  });
  it('requires resend settings in production and when resend is selected', () => {
    const prod = { ...ok, NODE_ENV: 'production', CORS_ORIGIN: 'https://a' };
    expect(() => validateEnv(prod)).toThrow(/MAIL_TRANSPORT=resend is required/);
    expect(() => validateEnv({ ...prod, MAIL_TRANSPORT: 'resend' })).toThrow(/RESEND_API_KEY/);
    expect(() => validateEnv({ ...prod, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_x' })).toThrow(/MAIL_FROM/);
    const good = { ...prod, MAIL_TRANSPORT: 'resend', RESEND_API_KEY: 're_x', MAIL_FROM: 'A <a@b.com>' };
    expect(validateEnv(good)).toBe(good);
  });
  it('validates ENCRYPTION_KEY (base64, 32 bytes) without echoing it', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    expect(validateEnv({ ...ok, ENCRYPTION_KEY: key })).toBeDefined();
    expect(() => validateEnv({ ...ok, ENCRYPTION_KEY: 'too-short-key' })).toThrow(/ENCRYPTION_KEY/);
    try {
      validateEnv({ ...ok, ENCRYPTION_KEY: 'too-short-key' });
    } catch (e) {
      expect((e as Error).message).not.toContain('too-short-key');
    }
  });
  it('validates the commission, payout and return settings', () => {
    expect(validateEnv({ ...ok, COMMISSION_DEFAULT_BPS: '500', PAYOUT_HOLD_DAYS: '14', PAYOUT_MIN_CENTS: '1000', RETURN_WINDOW_DAYS: '14' })).toBeDefined();
    expect(() => validateEnv({ ...ok, COMMISSION_DEFAULT_BPS: '6000' })).toThrow(/COMMISSION_DEFAULT_BPS/);
    expect(() => validateEnv({ ...ok, PAYOUT_HOLD_DAYS: '-1' })).toThrow(/PAYOUT_HOLD_DAYS/);
    expect(() => validateEnv({ ...ok, PAYOUT_MIN_CENTS: 'abc' })).toThrow(/PAYOUT_MIN_CENTS/);
    expect(() => validateEnv({ ...ok, RETURN_WINDOW_DAYS: '0' })).toThrow(/RETURN_WINDOW_DAYS/);
  });
});

describe('readCookie', () => {
  it('parses a named cookie and tolerates malformed headers', () => {
    expect(readCookie('a=1; ls_session=tok%20en; b=2', 'ls_session')).toBe('tok en');
    expect(readCookie(undefined, 'x')).toBeUndefined();
    expect(readCookie('garbage', 'x')).toBeUndefined();
  });
});
