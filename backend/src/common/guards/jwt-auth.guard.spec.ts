import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AllowGuest } from '../decorators/allow-guest.decorator';
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

describe('JwtStrategy.validate', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const strategy = new JwtStrategy({ getOrThrow: () => 'test-secret-test-secret-test-secret' } as never, prisma as never);

  it('never accepts a one-purpose token (e.g. the guest order link) as a session', async () => {
    await expect(strategy.validate({ sub: 'u1', role: 'CONSUMER', purpose: 'guest-orders' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('exposes isGuest on the request user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: null, role: 'CONSUMER', status: 'ACTIVE', isGuest: true, consumerProfile: { id: 'p1', displayName: 'Jan' }, businessOwnerProfile: null });
    await expect(strategy.validate({ sub: 'u1', role: 'CONSUMER' })).resolves.toMatchObject({ id: 'u1', isGuest: true, profileId: 'p1' });
  });
});
