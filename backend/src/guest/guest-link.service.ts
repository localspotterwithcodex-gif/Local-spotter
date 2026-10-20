import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** A guest session is deliberately short; the emailed link opens a fresh one. */
export const GUEST_SESSION_TTL = '24h';
export const GUEST_LINK_TTL = '7d';
export const GUEST_LINK_PURPOSE = 'guest-orders';

/** Builds the personal "view your order" link of a guest (used by e-mails). Kept free of heavy imports. */
@Injectable()
export class GuestLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private frontendUrl(): string {
    return (this.config.get<string>('FRONTEND_URL') || (this.config.get<string>('CORS_ORIGIN') || 'http://localhost:3000').split(',')[0]).trim().replace(/\/+$/, '');
  }

  /** One-purpose token: carries `purpose`, so JwtStrategy refuses it as a session. */
  signLinkToken(userId: string): string {
    return this.jwt.sign({ sub: userId, purpose: GUEST_LINK_PURPOSE }, { expiresIn: GUEST_LINK_TTL });
  }

  /** `https://app/guest/orders?token=…` for an active guest user, or null for everyone else. */
  async orderLinkFor(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isGuest: true, status: true } });
    if (!user?.isGuest || user.status !== UserStatus.ACTIVE) return null;
    return `${this.frontendUrl()}/guest/orders?token=${encodeURIComponent(this.signLinkToken(userId))}`;
  }
}
