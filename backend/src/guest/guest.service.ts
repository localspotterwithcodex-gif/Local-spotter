import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_PROVIDER, MailProvider } from '../mail/mail.provider';
import { CONSENT_VERSION, MAX_VERIFICATION_ATTEMPTS, VERIFICATION_CODE_TTL_MS } from '../auth/auth.service';
import { CreateGuestDto } from './dto/guest.dto';
import { GUEST_LINK_PURPOSE, GUEST_SESSION_TTL, GuestLinkService } from './guest-link.service';

/** A guest session is deliberately short; the emailed link opens a fresh one. */
const GUEST_IDLE_DAYS = 3;
const BCRYPT_ROUNDS = 12;

const GENERIC_LINK_RESPONSE = { message: 'Als er een bestelling met deze gegevens bestaat, is er een link naar je e-mail verzonden.' };

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
    private readonly links: GuestLinkService,
  ) {}

  // ---------- creating a guest ----------

  /**
   * Creates a password-less shadow consumer account for one checkout. The e-mail is only a
   * contact address (`guest_email`): `users.email` stays empty, so nobody can log in as, or
   * collide with, a registered account that uses the same address.
   */
  async createGuest(dto: CreateGuestDto): Promise<{ accessToken: string; user: ReturnType<GuestService['view']> }> {
    const name = dto.name.trim();
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          role: UserRole.CONSUMER,
          status: UserStatus.ACTIVE,
          isGuest: true,
          guestEmail: dto.email.trim().toLowerCase(),
          consentAcceptedAt: new Date(),
          consentVersion: CONSENT_VERSION,
        },
      });
      const profile = await tx.consumerProfile.create({
        data: { userId: created.id, displayName: name, firstName: name, phone: dto.phone?.trim() || null },
      });
      return { ...created, consumerProfile: profile };
    });
    return { accessToken: this.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: GUEST_SESSION_TTL }), user: this.view(user) };
  }

  private view(user: { id: string; role: UserRole; status: UserStatus; isGuest: boolean; consumerProfile: { id: string; displayName: string } | null; createdAt: Date }) {
    return {
      id: user.id,
      email: null as string | null,
      role: user.role,
      status: user.status,
      displayName: user.consumerProfile?.displayName,
      profileId: user.consumerProfile?.id,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
    };
  }

  // ---------- emailed order link ----------

  /** Always answers the same, so the endpoint cannot be used to find out which orders exist. */
  async requestOrderLink(email: string, orderNumber: string): Promise<{ message: string }> {
    try {
      const wanted = email.trim().toLowerCase();
      const number = orderNumber.trim();
      const order =
        (await this.prisma.customerOrder.findFirst({
          where: { orderNumber: number },
          select: { consumerProfile: { select: { userId: true } } },
        })) ??
        (await this.prisma.order.findFirst({ where: { orderNumber: number }, select: { consumerProfile: { select: { userId: true } } } }));
      const userId = order?.consumerProfile.userId;
      if (!userId) return GENERIC_LINK_RESPONSE;
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isGuest: true, guestEmail: true, status: true } });
      if (!user?.isGuest || user.status !== UserStatus.ACTIVE || user.guestEmail !== wanted) return GENERIC_LINK_RESPONSE;
      const link = await this.links.orderLinkFor(userId);
      if (link && this.mail.isConfigured()) {
        await this.mail.send({
          to: wanted,
          channel: 'EMAIL',
          subject: 'Je LocalSpotter-bestelling',
          text: `Bekijk je bestelling via deze persoonlijke link (7 dagen geldig):\n\n${link}\n\nDeel deze link met niemand.`,
        });
      }
    } catch (err) {
      this.logger.warn(`Guest order link could not be sent (${err instanceof Error ? err.name : 'error'})`);
    }
    return GENERIC_LINK_RESPONSE;
  }

  /** Exchanges an emailed link token for a fresh short guest session. */
  async startSessionFromLink(token: string): Promise<{ accessToken: string; user: ReturnType<GuestService['view']> }> {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.');
    }
    if (payload.purpose !== GUEST_LINK_PURPOSE || !payload.sub) {
      throw new UnauthorizedException('Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { consumerProfile: true } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.');
    }
    if (!user.isGuest) {
      throw new BadRequestException('Dit account is al omgezet naar een volledig account. Log in met je wachtwoord.');
    }
    return { accessToken: this.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: GUEST_SESSION_TTL }), user: this.view(user) };
  }

  // ---------- claiming a real account ----------

  private hashCode(userId: string, code: string): string {
    return crypto.createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET')).update(`claim:${userId}:${code}`).digest('hex');
  }

  private async requireGuest(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isGuest || !user.guestEmail || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Alleen een gastaccount kan worden omgezet');
    }
    return user as typeof user & { guestEmail: string };
  }

  private async assertEmailFree(email: string, selfId: string): Promise<void> {
    const taken = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, id: { not: selfId } }, select: { id: true } });
    if (taken) {
      throw new ConflictException({ code: 'EMAIL_IN_USE', message: 'Er bestaat al een account met dit e-mailadres. Log in om je bestelling terug te zien.' });
    }
  }

  /** Step 1: send a 6-digit code to the guest's address; proves ownership before it becomes a login. */
  async startClaim(userId: string): Promise<{ message: string }> {
    if (!this.mail.isConfigured() || !this.mail.supports('EMAIL')) {
      throw new HttpException('Account aanmaken is tijdelijk niet beschikbaar', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const user = await this.requireGuest(userId);
    await this.assertEmailFree(user.guestEmail, user.id);

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: this.hashCode(user.id, code),
        verificationCodeExpiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
        verificationAttempts: 0,
      },
    });
    await this.mail.send({
      to: user.guestEmail,
      channel: 'EMAIL',
      subject: 'Je LocalSpotter verificatiecode',
      text: `Je verificatiecode is ${code}. Deze is 10 minuten geldig. Deel deze code met niemand.`,
    });
    return { message: 'We hebben een code naar je e-mailadres gestuurd.' };
  }

  /** Step 2: code + password turn the guest into a normal, verified consumer account. */
  async completeClaim(userId: string, code: string, password: string) {
    const invalid = () => new BadRequestException('Ongeldige of verlopen verificatiecode');
    const user = await this.requireGuest(userId);
    if (!user.verificationCode || !user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) throw invalid();
    if (user.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      await this.prisma.user.update({ where: { id: user.id }, data: { verificationCode: null, verificationCodeExpiresAt: null } });
      throw new HttpException('Te veel pogingen. Vraag een nieuwe code aan.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const expected = Buffer.from(user.verificationCode, 'hex');
    const actual = Buffer.from(this.hashCode(user.id, code), 'hex');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      await this.prisma.user.update({ where: { id: user.id }, data: { verificationAttempts: { increment: 1 } } });
      throw invalid();
    }
    await this.assertEmailFree(user.guestEmail, user.id);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.guestEmail,
          guestEmail: null,
          isGuest: false,
          passwordHash,
          emailVerifiedAt: new Date(),
          verificationCode: null,
          verificationCodeExpiresAt: null,
          verificationAttempts: 0,
        },
        include: { consumerProfile: true },
      });
      return { ...this.view(updated), email: updated.email };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_IN_USE', message: 'Er bestaat al een account met dit e-mailadres. Log in om je bestelling terug te zien.' });
      }
      throw err;
    }
  }

  // ---------- housekeeping ----------

  /** Removes guests that never completed a checkout (no order, no booking), 3 days after creation. */
  async cleanupIdleGuests(now = new Date()): Promise<{ removed: number }> {
    const cutoff = new Date(now.getTime() - GUEST_IDLE_DAYS * 24 * 60 * 60 * 1000);
    const idle = await this.prisma.user.findMany({
      where: {
        isGuest: true,
        createdAt: { lt: cutoff },
        consumerProfile: { is: { orders: { none: {} }, customerOrders: { none: {} }, workshopBookings: { none: {} } } },
      },
      select: { id: true },
      take: 500,
    });
    if (idle.length === 0) return { removed: 0 };
    const result = await this.prisma.user.deleteMany({ where: { id: { in: idle.map((u) => u.id) }, isGuest: true } });
    return { removed: result.count };
  }
}
