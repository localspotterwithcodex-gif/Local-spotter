import { Injectable, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_GUEST_KEY } from '../decorators/allow-guest.decorator';
import { ALLOW_WITHOUT_MFA_KEY } from '../decorators/allow-without-mfa.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector?: Reflector) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any, _info: any, context?: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication token missing or invalid');
    }
    if (user.isGuest && context) {
      const allowed = this.reflector?.getAllAndOverride<boolean>(ALLOW_GUEST_KEY, [context.getHandler(), context.getClass()]);
      if (!allowed) {
        throw new ForbiddenException('Maak een account aan om deze functie te gebruiken');
      }
    }
    // Every admin action needs a session made with the second factor; until then only enrolment works.
    if (user.role === 'SUPER_ADMIN' && !user.mfa && context) {
      const allowed = this.reflector?.getAllAndOverride<boolean>(ALLOW_WITHOUT_MFA_KEY, [context.getHandler(), context.getClass()]);
      if (!allowed) {
        throw new ForbiddenException({
          statusCode: 403,
          code: user.mfaEnrolled ? 'MFA_REQUIRED' : 'MFA_ENROLLMENT_REQUIRED',
          message: 'Tweestapsverificatie is vereist voor beheerders',
        });
      }
    }
    return user;
  }
}
