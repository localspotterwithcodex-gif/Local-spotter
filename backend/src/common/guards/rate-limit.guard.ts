import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, Optional, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface RateLimitOptions {
  /** Max requests per window for one key. */
  limit: number;
  windowMs: number;
  /** Request body field mixed into the key (e.g. the login identifier). */
  bodyKey?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit_options';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Fixed-window limiter shared by every API instance: counters live in the `rate_limit_hits`
 * table (one atomic upsert per limited request). Signed-in callers are counted per account,
 * others per client IP (`req.ip`, which honours TRUST_PROXY). Keys are hashed, so no IPs or
 * e-mail addresses are stored. If the database is unreachable it falls back to per-process
 * counters instead of failing open or blocking everyone.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger('RateLimit');
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;

    const req = context.switchToHttp().getRequest<{ ip?: string; body?: Record<string, unknown>; user?: { id?: string } }>();
    const bodyValue = options.bodyKey ? String(req.body?.[options.bodyKey] ?? '').toLowerCase().trim().slice(0, 120) : '';
    const who = req.user?.id ? `u:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`;
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const key = createHash('sha256').update(`${route}|${who}|${bodyValue}`).digest('hex');

    const { count, resetAt } = await this.hit(key, options.windowMs);
    if (count <= options.limit) return true;

    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    context.switchToHttp().getResponse<{ setHeader?: (k: string, v: string) => void }>()?.setHeader?.('Retry-After', String(retryAfter));
    if (count === options.limit + 1) this.logger.warn(`Limit reached on ${route} (key ${key.slice(0, 12)})`);
    throw new HttpException('Too many attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }

  private async hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    if (this.prisma) {
      try {
        const rows = await this.prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
          INSERT INTO "rate_limit_hits" ("key", "count", "reset_at")
          VALUES (${key}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond')
          ON CONFLICT ("key") DO UPDATE SET
            "count" = CASE WHEN "rate_limit_hits"."reset_at" <= NOW() THEN 1 ELSE "rate_limit_hits"."count" + 1 END,
            "reset_at" = CASE WHEN "rate_limit_hits"."reset_at" <= NOW() THEN EXCLUDED."reset_at" ELSE "rate_limit_hits"."reset_at" END
          RETURNING "count", "reset_at"`;
        // Occasional cleanup of expired windows keeps the table small without a separate job.
        if (Math.random() < 0.005) {
          void this.prisma.$executeRaw`DELETE FROM "rate_limit_hits" WHERE "reset_at" < NOW() - INTERVAL '1 hour'`.catch(() => undefined);
        }
        return { count: Number(rows[0].count), resetAt: new Date(rows[0].reset_at).getTime() };
      } catch {
        this.logger.warn('Shared rate-limit store unavailable; using per-process counters');
      }
    }
    return this.memoryHit(key, windowMs);
  }

  private memoryHit(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    if (this.hits.size >= 5000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.hits.set(key, fresh);
      return fresh;
    }
    entry.count += 1;
    return entry;
  }
}
