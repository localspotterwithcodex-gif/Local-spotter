import { Injectable, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_GUEST_KEY } from '../decorators/allow-guest.decorator';

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
    return user;
  }
}
