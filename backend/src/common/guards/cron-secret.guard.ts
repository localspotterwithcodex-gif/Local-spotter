import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Protects internal job endpoints (retention, payouts, ...) that an external scheduler
 * (Render Cron Job, GitHub Action) calls with `x-cron-secret: <CRON_SECRET>`.
 * With no CRON_SECRET configured the endpoints are disabled, never open.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('CRON_SECRET');
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const provided = req.headers['x-cron-secret'];
    if (!secret || secret.length < 16 || typeof provided !== 'string') {
      throw new ForbiddenException('Job endpoint not available');
    }
    // Hash both sides so the comparison is constant-time regardless of length.
    const a = createHash('sha256').update(secret).digest();
    const b = createHash('sha256').update(provided).digest();
    if (!timingSafeEqual(a, b)) throw new ForbiddenException('Job endpoint not available');
    return true;
  }
}
