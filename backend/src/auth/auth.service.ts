import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email?.toLowerCase().trim() || null;
    const mobile = dto.phone?.trim() || null;

    if (!email && !mobile) {
      throw new BadRequestException('E-mailadres of telefoonnummer is verplicht');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(mobile ? [{ mobile }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Er bestaat al een account met dit e-mailadres of telefoonnummer');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Verification is pending until the OTP (mobile) or email link/code is confirmed.
    // The frontend must call the not-yet-existing /auth/verify-email and /auth/verify-otp
    // endpoints (see PROMPT item 2) before login is allowed for this account.
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          mobile,
          passwordHash,
          role: dto.role,
          // Account stays PENDING_VERIFICATION until /auth/verify-email or
          // /auth/verify-otp confirms the identifier used to sign up.
          status: UserStatus.PENDING_VERIFICATION,
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
      } else if (dto.role === UserRole.BUSINESS_OWNER) {
        await tx.businessOwnerProfile.create({
          data: {
            userId: newUser.id,
            displayName: dto.displayName,
            phone: dto.phone || null,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          consumerProfile: true,
          businessOwnerProfile: true,
        },
      });
    });

    const verificationChannel = email ? 'EMAIL' : 'MOBILE';
    await this.issueVerificationCode(user!.id, verificationChannel);

    return {
      pendingVerification: true,
      verificationChannel,
      identifier: email || mobile,
      user: this.sanitizeUser(user!),
    };
  }

  /**
   * Generates a 6-digit code, stores it (hashed would be preferable in a
   * real deployment) with a 10 minute expiry, and dispatches it through
   * the relevant channel. Wire `MailProvider`/`SmsProvider` here once real
   * providers (e.g. SendGrid / Twilio) are configured — for now the code
   * is logged so it can be used in development/testing.
   */
  private async issueVerificationCode(userId: string, channel: 'EMAIL' | 'MOBILE') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationCode: code, verificationCodeExpiresAt: expiresAt },
    });

    // TODO: replace with real MailProvider / SmsProvider dispatch.
    // eslint-disable-next-line no-console
    console.log(`[DEV] Verification code for user ${userId} via ${channel}: ${code}`);

    return { code, expiresAt };
  }

  async resendVerificationCode(identifier: string) {
    const user = await this.findByIdentifier(identifier);
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      return { message: 'Als het account bestaat en nog niet geverifieerd is, is er een nieuwe code verzonden.' };
    }
    const channel = user.email ? 'EMAIL' : 'MOBILE';
    await this.issueVerificationCode(user.id, channel);
    return { message: 'Als het account bestaat en nog niet geverifieerd is, is er een nieuwe code verzonden.' };
  }

  async verifyCode(identifier: string, code: string) {
    const user = await this.findByIdentifier(identifier);

    if (!user || !user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new BadRequestException('Ongeldige of verlopen verificatiecode');
    }

    if (user.verificationCode !== code || user.verificationCodeExpiresAt < new Date()) {
      throw new BadRequestException('Ongeldige of verlopen verificatiecode');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        verificationCode: null,
        verificationCodeExpiresAt: null,
        emailVerifiedAt: user.email ? new Date() : user.emailVerifiedAt,
        mobileVerifiedAt: user.mobile ? new Date() : user.mobileVerifiedAt,
      },
      include: { consumerProfile: true, businessOwnerProfile: true },
    });

    const token = this.generateJwt(updated);

    return {
      accessToken: token,
      user: this.sanitizeUser(updated),
    };
  }

  /**
   * Looks a user up by whatever identifier they typed in — email, mobile
   * number, or username (admin accounts use username, see prisma seed).
   */
  private async findByIdentifier(identifier: string) {
  const value = identifier.trim();

  return this.prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: value, mode: 'insensitive' } },
        { mobile: value },
      ],
    },
    include: {
      consumerProfile: true,
      businessOwnerProfile: true,
    },
  });
}

  async login(dto: LoginDto) {
    const user = await this.findByIdentifier(dto.identifier);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Ongeldige inloggegevens');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Ongeldige inloggegevens');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Account is geschorst of gedeactiveerd');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException(
        'Account is nog niet geverifieerd. Controleer je e-mail of telefoon voor de verificatiecode.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateJwt(user);

    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        consumerProfile: true,
        businessOwnerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Gebruiker niet gevonden');
    }

    return this.sanitizeUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      // Return success to prevent email enumeration
      return { message: 'Als de e-mail bekend is bij ons, is er een herstelinstructie verzonden.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      message: 'Als de e-mail bekend is bij ons, is er een herstelinstructie verzonden.',
      demoToken: token, // Exposed for development demo convenience
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Ongeldige of verlopen reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Wachtwoord succesvol bijgewerkt. Je kunt nu inloggen.' };
  }

  private generateJwt(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: any) {
    const profileId =
      user.role === UserRole.CONSUMER
        ? user.consumerProfile?.id
        : user.role === UserRole.BUSINESS_OWNER
        ? user.businessOwnerProfile?.id
        : undefined;

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
      role: user.role,
      status: user.status,
      displayName,
      profileId,
      createdAt: user.createdAt,
    };
  }
}
