import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESSION_COOKIE, readCookie } from '../../auth/utils/session-cookie';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie sessions (defence in depth on top of SameSite=Lax):
 * a state-changing request that authenticates via the session cookie must
 * come from an allowed origin. Requests using an Authorization header (API
 * clients) are not cookie-authenticated and are not affected.
 */
@Injectable()
export class OriginCheckGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(config: ConfigService) {
    this.allowedOrigins = (config.get<string>('CORS_ORIGIN') || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ method: string; headers: Record<string, string | undefined> }>();
    if (SAFE_METHODS.has(req.method.toUpperCase())) return true;
    if (req.headers.authorization) return true;
    if (!readCookie(req.headers.cookie, SESSION_COOKIE)) return true;

    const origin = req.headers.origin ?? this.originFromReferer(req.headers.referer);
    if (origin && this.allowedOrigins.includes(origin.replace(/\/$/, ''))) return true;
    throw new ForbiddenException({ statusCode: 403, message: 'Cross-site request blocked', code: 'ORIGIN_BLOCKED' });
  }

  private originFromReferer(referer?: string): string | undefined {
    if (!referer) return undefined;
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
}
