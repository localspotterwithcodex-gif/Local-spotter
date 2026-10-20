import { ForbiddenException } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard';

const ctx = (headers: Record<string, any>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;
const guard = (secret?: string) => new CronSecretGuard({ get: () => secret } as any);
const SECRET = 'a-long-enough-secret-value';

describe('CronSecretGuard', () => {
  it('accepts the exact secret', () => {
    expect(guard(SECRET).canActivate(ctx({ 'x-cron-secret': SECRET }))).toBe(true);
  });
  it('rejects a wrong or missing header', () => {
    expect(() => guard(SECRET).canActivate(ctx({ 'x-cron-secret': 'nope' }))).toThrow(ForbiddenException);
    expect(() => guard(SECRET).canActivate(ctx({}))).toThrow(ForbiddenException);
  });
  it('is disabled when no (or a too short) secret is configured', () => {
    expect(() => guard(undefined).canActivate(ctx({ 'x-cron-secret': 'x' }))).toThrow(ForbiddenException);
    expect(() => guard('short').canActivate(ctx({ 'x-cron-secret': 'short' }))).toThrow(ForbiddenException);
  });
});
