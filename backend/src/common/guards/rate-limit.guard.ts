import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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
 * Small in-memory fixed-window limiter for abuse-prone auth endpoints.
 * LIMITATION: counters are per process — behind several instances use a
 * shared store (Redis) or an edge/WAF limiter. Documented in SECURITY notes.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(RATE_LIMIT_KEY, context.getHandler());
    if (!options) return true;

    const req = context.switchToHttp().getRequest<{ ip?: string; body?: Record<string, unknown>; route?: { path?: string } }>();
    const bodyValue = options.bodyKey ? String(req.body?.[options.bodyKey] ?? '').toLowerCase().trim().slice(0, 120) : '';
    const key = `${context.getClass().name}.${context.getHandler().name}|${req.ip ?? 'unknown'}|${bodyValue}`;

    const now = Date.now();
    this.sweep(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }
    entry.count += 1;
    if (entry.count > options.limit) {
      throw new HttpException('Too many attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }

  private sweep(now: number): void {
    if (this.hits.size < 5000) return;
    for (const [key, value] of this.hits) {
      if (value.resetAt <= now) this.hits.delete(key);
    }
  }
}
