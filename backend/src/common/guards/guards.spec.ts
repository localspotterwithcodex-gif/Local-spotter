import { ExecutionContext, ForbiddenException, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { OriginCheckGuard } from './origin-check.guard';
import { RateLimit, RateLimitGuard } from './rate-limit.guard';
import { validateEnv } from '../../config/env.validation';
import { readCookie } from '../../auth/utils/session-cookie';

function ctx(req: Record<string, unknown>, handler: object = function handle() {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
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
  const guard = new RateLimitGuard(new Reflector());

  it('blocks after the limit per ip+identifier but not for another identifier', () => {
    const req = (identifier: string) => ({ ip: '1.2.3.4', body: { identifier } });
    expect(guard.canActivate(ctx(req('a'), handler))).toBe(true);
    expect(guard.canActivate(ctx(req('a'), handler))).toBe(true);
    expect(() => guard.canActivate(ctx(req('a'), handler))).toThrow(HttpException);
    expect(guard.canActivate(ctx(req('b'), handler))).toBe(true);
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
});

describe('readCookie', () => {
  it('parses a named cookie and tolerates malformed headers', () => {
    expect(readCookie('a=1; ls_session=tok%20en; b=2', 'ls_session')).toBe('tok en');
    expect(readCookie(undefined, 'x')).toBeUndefined();
    expect(readCookie('garbage', 'x')).toBeUndefined();
  });
});
