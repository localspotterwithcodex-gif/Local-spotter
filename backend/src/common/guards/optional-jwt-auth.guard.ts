import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Populates `req.user` when a valid session cookie / bearer token is present and
 * silently continues as anonymous otherwise. For public endpoints whose response
 * differs for owners/admins (e.g. previewing an inactive product or draft workshop).
 * It never grants anything by itself: services still authorise the resolved user.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(_err: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}
