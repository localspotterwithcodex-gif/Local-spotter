import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MAIL_PROVIDER, MailProvider } from '../mail/mail.provider';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_VERIFICATION_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;
/** Pre-computed hash so login timing does not reveal whether an account exists. */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5VnVTfKkfUlZqe1k3sFvD0jV6mQXZ3W';

const GENERIC_REGISTER_RESPONSE = (identifier: string, channel: 'EMAIL' | 'MOBILE') => ({
  pendingVerification: true,
  verificationChannel: channel,
  identifier,
});

/** Profiles plus their picture, so every auth response can carry the avatar URL. */
const WITH_PROFILES = {
  consumerProfile: { include: { profileImageAsset: { select: { url: true } } } },
  businessOwnerProfile: { include: { profileImageAsset: { select: { url: true } } } },
} satisfies Prisma.UserInclude;
type UserWithProfiles = Prisma.UserGetPayload<{ include: typeof WITH_PROFILES }>;

/** Bump when the terms or privacy policy change materially. */
export const CONSENT_VERSION = '2026-10';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject(MAIL_PROVIDER) private mail: MailProvider,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email?.toLowerCase().trim() || null;
    const mobile = dto.phone?.trim() || null;

    if (!email && !mobile) {
      throw new BadRequestException('E-mailadres of telefoonnummer is verplicht');
    }
    if (dto.role !== UserRole.CONSUMER && dto.role !== UserRole.BUSINESS_OWNER) {
      // Defence in depth: the DTO already restricts this; privileged roles are
      // never created through public registration.
      throw new BadRequestException('Rol moet CONSUMER of BUSINESS_OWNER zijn');
    }
    const verificationChannel: 'EMAIL' | 'MOBILE' = email ? 'EMAIL' : 'MOBILE';
    if (!this.mail.isConfigured() || !this.mail.supports(verificationChannel === 'EMAIL' ? 'EMAIL' : 'SMS')) {
      // Do not create accounts nobody can verify (e.g. mobile signup while no SMS provider exists).
      throw new HttpException('Registratie is tijdelijk niet beschikbaar', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const identifier = (email || mobile) as string;

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(mobile ? [{ mobile }] : [])] },
    });

    if (existingUser) {
      // Same response as a fresh registration (no account enumeration). The
      // real owner is told by message that an account already exists.
      await this.notifyExistingAccount(existingUser, verificationChannel, identifier);
      return GENERIC_REGISTER_RESPONSE(identifier, verificationChannel);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          mobile,
          passwordHash,
          role: dto.role,
          status: UserStatus.PENDING_VERIFICATION,
          consentAcceptedAt: new Date(),
          consentVersion: CONSENT_VERSION,
        },
      });

      if (dto.role === UserRole.CONSUMER) {
        await tx.consumerProfile.create({
          data: {
            userId: newUser.id,
            displayName: dto.displayName,
            firstName: dto.firstName || null,
            lastName: dto.lastName || null,
            phone: dto.phone || null,
          },
        });
      } else {
        await tx.businessOwnerProfile.create({
          data: { userId: newUser.id, displayName: dto.displayName, phone: dto.phone || null },
        });
      }
      return newUser;
    });

    await this.issueVerificationCode(user.id, verificationChannel, identifier);
    return GENERIC_REGISTER_RESPONSE(identifier, verificationChannel);
  }

  private async notifyExistingAccount(user: { id: string; status: UserStatus }, channel: 'EMAIL' | 'MOBILE', identifier: string) {
    try {
      if (user.status === UserStatus.PENDING_VERIFICATION) {
        await this.issueVerificationCode(user.id, channel, identifier);
      } else {
        await this.mail.send({
          to: identifier,
          channel: channel === 'EMAIL' ? 'EMAIL' : 'SMS',
          subject: 'Je hebt al een LocalSpotter-account',
          text: 'Iemand probeerde een account aan te maken met dit adres. Je hebt al een account: log in of gebruik "Wachtwoord vergeten".',
        });
      }
    } catch (err) {
      this.logger.warn(`Could not notify existing account holder (${err instanceof Error ? err.name : 'error'})`);
    }
  }

  /** HMAC so a database leak alone does not reveal valid one-time codes. */
  private hashCode(userId: string, code: string): string {
    return crypto.createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET')).update(`otp:${userId}:${code}`).digest('hex');
  }

  /**
   * Generates a cryptographically random 6-digit code, stores only its HMAC
   * (10 minute expiry, attempt counter reset) and sends it through the
   * configured provider. The code is never logged or returned.
   */
  private async issueVerificationCode(userId: string, channel: 'EMAIL' | 'MOBILE', to: string) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode: this.hashCode(userId, code),
        verificationCodeExpiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
        verificationAttempts: 0,
      },
    });

    await this.mail.send({
      to,
      channel: channel === 'EMAIL' ? 'EMAIL' : 'SMS',
      subject: 'Je LocalSpotter verificatiecode',
      text: `Je verificatiecode is ${code}. Deze is 10 minuten geldig. Deel deze code met niemand.`,
    });
  }

  async resendVerificationCode(identifier: string) {
    const response = { message: 'Als het account bestaat en nog niet geverifieerd is, is er een nieuwe code verzonden.' };
    const user = await this.findByIdentifier(identifier);
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) return response;
    const channel: 'EMAIL' | 'MOBILE' = user.email ? 'EMAIL' : 'MOBILE';
    const to = (user.email ?? user.mobile) as string;
    try {
      await this.issueVerificationCode(user.id, channel, to);
    } catch (err) {
      this.logger.warn(`Verification code could not be delivered (${err instanceof Error ? err.name : 'error'})`);
    }
    return response;
  }

  async verifyCode(identifier: string, code: string) {
    const invalid = () => new BadRequestException('Ongeldige of verlopen verificatiecode');
    const user = await this.findByIdentifier(identifier);

    if (!user || user.status !== UserStatus.PENDING_VERIFICATION || !user.verificationCode || !user.verificationCodeExpiresAt) {
      throw invalid();
    }

    if (user.verificationCodeExpiresAt < new Date()) {
      throw invalid();
    }

    if (user.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      // Code burned: the user must request a new one.
      await this.prisma.user.update({ where: { id: user.id }, data: { verificationCode: null, verificationCodeExpiresAt: null } });
      throw new HttpException('Te veel pogingen. Vraag een nieuwe code aan.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const expected = Buffer.from(user.verificationCode, 'hex');
    const actual = Buffer.from(this.hashCode(user.id, code), 'hex');
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
      await this.prisma.user.update({ where: { id: user.id }, data: { verificationAttempts: { increment: 1 } } });
      throw invalid();
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        verificationAttempts: 0,
        emailVerifiedAt: user.email ? new Date() : user.emailVerifiedAt,
        mobileVerifiedAt: user.mobile ? new Date() : user.mobileVerifiedAt,
      },
      include: WITH_PROFILES,
    });

    return { accessToken: this.generateJwt(updated), user: this.sanitizeUser(updated) };
  }

  /**
   * Looks a user up by whatever identifier they typed in — email, mobile
   * number, or username (admin/owner demo accounts use username).
   */
  private async findByIdentifier(identifier: string): Promise<UserWithProfiles | null> {
    const value = identifier.trim();
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: { equals: value, mode: 'insensitive' } }, { mobile: value }, { username: { equals: value, mode: 'insensitive' } }],
      },
      include: WITH_PROFILES,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.findByIdentifier(dto.identifier);

    // Always run one bcrypt comparison so response time does not reveal
    // whether the account exists.
    const isMatch = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !isMatch) {
      throw new UnauthorizedException('Ongeldige inloggegevens');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Account is geschorst of gedeactiveerd');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Account is nog niet geverifieerd. Controleer je e-mail of telefoon voor de verificatiecode.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { accessToken: this.generateJwt(user), user: this.sanitizeUser(user) };
  }

  /** Removes the provider link (idempotent). The user's own account is kept until they ask for full deletion. */
  async unlinkOAuthAccount(provider: string, providerAccountId: string): Promise<void> {
    await this.prisma.oAuthAccount.deleteMany({ where: { provider, providerAccountId } });
  }

  /**
   * Completes a login that a provider (Google) already verified.
   * - known provider account  -> log in
   * - known verified email    -> link provider to that account, log in
   * - otherwise               -> create account (role required, else 409 ROLE_REQUIRED)
   * Linking a still-unverified password account clears its password, so someone
   * who pre-registered another person's email cannot keep access to it.
   */
  async completeSocialLogin(
    profile: { provider: string; providerAccountId: string; email: string | null; emailVerified: boolean; name: string | null },
    role?: UserRole,
  ) {
    const include = WITH_PROFILES;
    const linked = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: profile.provider, providerAccountId: profile.providerAccountId } },
      include: { user: { include } },
    });

    let user: UserWithProfiles | null = linked?.user ?? null;

    if (!user) {
      if (!profile.email || !profile.emailVerified) {
        throw new BadRequestException('Dit account heeft geen bevestigd e-mailadres');
      }
      const existing = await this.prisma.user.findFirst({ where: { email: { equals: profile.email, mode: 'insensitive' } }, include });
      if (existing) {
        const wasPending = existing.status === UserStatus.PENDING_VERIFICATION;
        if (existing.status === UserStatus.SUSPENDED || existing.status === UserStatus.DELETED) {
          throw new UnauthorizedException('Account is geschorst of gedeactiveerd');
        }
        await this.prisma.$transaction([
          this.prisma.oAuthAccount.create({ data: { userId: existing.id, provider: profile.provider, providerAccountId: profile.providerAccountId } }),
          ...(wasPending
            ? [
                this.prisma.user.update({
                  where: { id: existing.id },
                  data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date(), passwordHash: null, verificationCode: null, verificationCodeExpiresAt: null },
                }),
              ]
            : []),
        ]);
        user = wasPending ? { ...existing, status: UserStatus.ACTIVE } : existing;
      } else {
        if (role !== UserRole.CONSUMER && role !== UserRole.BUSINESS_OWNER) {
          throw new ConflictException({ code: 'ROLE_REQUIRED', message: 'Kies eerst of je klant of ondernemer bent' });
        }
        const displayName = (profile.name || profile.email.split('@')[0]).slice(0, 80);
        user = await this.prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: { email: profile.email, role, status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
          });
          await tx.oAuthAccount.create({ data: { userId: created.id, provider: profile.provider, providerAccountId: profile.providerAccountId } });
          if (role === UserRole.CONSUMER) {
            await tx.consumerProfile.create({ data: { userId: created.id, displayName } });
          } else {
            await tx.businessOwnerProfile.create({ data: { userId: created.id, displayName } });
          }
          return tx.user.findUniqueOrThrow({ where: { id: created.id }, include });
        });
      }
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Account is geschorst of gedeactiveerd');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      // Existing pending account found through an already linked provider (defensive).
      throw new UnauthorizedException('Account is nog niet geverifieerd');
    }
    // Only SUPER_ADMIN-free flows: admins sign in with their password only.
    if (user.role === UserRole.SUPER_ADMIN) throw new UnauthorizedException('Ongeldige inlogpoging');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { accessToken: this.generateJwt(user), user: this.sanitizeUser(user) };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: WITH_PROFILES,
    });
    if (!user) throw new NotFoundException('Gebruiker niet gevonden');
    return this.sanitizeUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const response = { message: 'Als de e-mail bekend is bij ons, is er een herstelinstructie verzonden.' };
    if (!this.mail.isConfigured()) {
      throw new HttpException('Wachtwoordherstel is tijdelijk niet beschikbaar', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user || user.status === UserStatus.DELETED) return response;

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.$transaction([
      // Only the newest reset link stays valid.
      this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      }),
    ]);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || (this.config.get<string>('CORS_ORIGIN') || 'http://localhost:3000').split(',')[0].trim();
    try {
      await this.mail.send({
        to: email,
        channel: 'EMAIL',
        subject: 'Wachtwoord herstellen',
        text: `Gebruik deze link om je wachtwoord te herstellen (1 uur geldig): ${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`,
      });
    } catch (err) {
      this.logger.warn(`Password reset message could not be delivered (${err instanceof Error ? err.name : 'error'})`);
    }

    // The token is deliberately NOT part of the response.
    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!resetToken) throw new BadRequestException('Ongeldige of verlopen reset token');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'Wachtwoord succesvol bijgewerkt. Je kunt nu inloggen.' };
  }

  /** Lifetime of the session in ms (read from the signed token). */
  sessionMaxAgeMs(token: string): number {
    const decoded = this.jwtService.decode(token) as { exp?: number; iat?: number } | null;
    if (decoded?.exp) return Math.max(0, decoded.exp * 1000 - Date.now());
    return 24 * 60 * 60 * 1000;
  }

  private generateJwt(user: { id: string; role: UserRole }): string {
    // No PII in the token: it is also readable by the Next.js edge middleware.
    return this.jwtService.sign({ sub: user.id, role: user.role });
  }

  private sanitizeUser(user: UserWithProfiles) {
    const profileId =
      user.role === UserRole.CONSUMER ? user.consumerProfile?.id : user.role === UserRole.BUSINESS_OWNER ? user.businessOwnerProfile?.id : undefined;
    const displayName =
      user.role === UserRole.CONSUMER
        ? user.consumerProfile?.displayName
        : user.role === UserRole.BUSINESS_OWNER
        ? user.businessOwnerProfile?.displayName
        : 'Super Admin';

    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      username: user.username,
      role: user.role,
      status: user.status,
      displayName,
      avatarUrl: (user.role === UserRole.CONSUMER ? user.consumerProfile : user.role === UserRole.BUSINESS_OWNER ? user.businessOwnerProfile : null)?.profileImageAsset?.url ?? null,
      profileId,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
    };
  }
}
