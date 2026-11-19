import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AllowGuest } from '../decorators/allow-guest.decorator';
import { AllowWithoutMfa } from '../decorators/allow-without-mfa.decorator';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

class Plain {
  open() {}
  @AllowGuest() allowed() {}
}
@AllowGuest()
class AllowedController {
  anything() {}
}

const ctx = (cls: new () => object, method: string) =>
  ({ getHandler: () => (cls.prototype as Record<string, () => void>)[method], getClass: () => cls }) as unknown as ExecutionContext;

describe('JwtAuthGuard guest default-deny', () => {
  const guard = new JwtAuthGuard(new Reflector());
  const guest = { id: 'g', role: 'CONSUMER', isGuest: true };
  const member = { id: 'm', role: 'CONSUMER', isGuest: false };

  it('keeps rejecting missing users', () => {
    expect(() => guard.handleRequest(null, false, null, ctx(Plain, 'open'))).toThrow(UnauthorizedException);
  });
  it('lets normal users through everywhere', () => {
    expect(guard.handleRequest(null, member, null, ctx(Plain, 'open'))).toBe(member);
  });
  it('blocks guests unless the route or controller is marked AllowGuest', () => {
    expect(() => guard.handleRequest(null, guest, null, ctx(Plain, 'open'))).toThrow(ForbiddenException);
    expect(guard.handleRequest(null, guest, null, ctx(Plain, 'allowed'))).toBe(guest);
    expect(guard.handleRequest(null, guest, null, ctx(AllowedController, 'anything'))).toBe(guest);
  });
});

describe('JwtAuthGuard admin MFA', () => {
  const guard = new JwtAuthGuard(new Reflector());
  class Routes {
    adminAction() {}
    @AllowWithoutMfa() enrol() {}
  }

  it('refuses admin sessions without the second factor, with a code the app can act on', () => {
    const notEnrolled = { id: 'a', role: 'SUPER_ADMIN', mfa: false, mfaEnrolled: false };
    const enrolledNoMfa = { id: 'a', role: 'SUPER_ADMIN', mfa: false, mfaEnrolled: true };
    expect(() => guard.handleRequest(null, notEnrolled, null, ctx(Routes, 'adminAction'))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'MFA_ENROLLMENT_REQUIRED' }) }),
    );
    expect(() => guard.handleRequest(null, enrolledNoMfa, null, ctx(Routes, 'adminAction'))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'MFA_REQUIRED' }) }),
    );
    expect(guard.handleRequest(null, notEnrolled, null, ctx(Routes, 'enrol'))).toBe(notEnrolled);
  });

  it('lets MFA admin sessions and non-admins through', () => {
    const admin = { id: 'a', role: 'SUPER_ADMIN', mfa: true };
    const owner = { id: 'o', role: 'BUSINESS_OWNER' };
    expect(guard.handleRequest(null, admin, null, ctx(Routes, 'adminAction'))).toBe(admin);
    expect(guard.handleRequest(null, owner, null, ctx(Routes, 'adminAction'))).toBe(owner);
  });
});

describe('JwtStrategy.validate', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const strategy = new JwtStrategy({ getOrThrow: () => 'test-secret-test-secret-test-secret' } as never, prisma as never);

  it('never accepts a one-purpose token (e.g. the guest order link) as a session', async () => {
    await expect(strategy.validate({ sub: 'u1', role: 'CONSUMER', purpose: 'guest-orders' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('exposes isGuest on the request user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: null, role: 'CONSUMER', status: 'ACTIVE', isGuest: true, sessionVersion: 0, consumerProfile: { id: 'p1', displayName: 'Jan' }, businessOwnerProfile: null });
    await expect(strategy.validate({ sub: 'u1', role: 'CONSUMER' })).resolves.toMatchObject({ id: 'u1', isGuest: true, profileId: 'p1' });
  });

  it('rejects a session issued before the session version was bumped (password reset, MFA change)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.nl', role: 'CONSUMER', status: 'ACTIVE', isGuest: false, sessionVersion: 2, consumerProfile: { id: 'p1', displayName: 'Jan' }, businessOwnerProfile: null });
    await expect(strategy.validate({ sub: 'u1', role: 'CONSUMER', sv: 1 })).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate({ sub: 'u1', role: 'CONSUMER' })).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate({ sub: 'u1', role: 'CONSUMER', sv: 2 })).resolves.toMatchObject({ id: 'u1' });
  });
});
