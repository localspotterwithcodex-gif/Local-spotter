import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeRole, EmployeeStatus, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuthUser } from '../common/types/auth-user';
import { MAIL_PROVIDER, MailProvider } from '../mail/mail.provider';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EMPLOYEES_PER_SHOP = 25;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Store employees. MVP scope: an employee can work the shop's chat and see workshop participants.
 * Everything else (products, settings, subscription, payouts) stays owner-only.
 */
@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() @Inject(MAIL_PROVIDER) private readonly mail?: MailProvider,
  ) {}

  /** True when the user is an accepted, non-revoked employee of the business. */
  async isActiveStaff(userId: string, businessId: string): Promise<boolean> {
    const row = await this.prisma.merchantEmployee.findFirst({
      where: { userId, businessId, status: EmployeeStatus.ACTIVE },
      select: { id: true },
    });
    return !!row;
  }

  /** Owner (or admin) of the business, or one of its active employees. */
  async canAccessShop(user: AuthUser, businessId: string): Promise<boolean> {
    if (user.role === UserRole.SUPER_ADMIN) return true;
    if (user.role === UserRole.BUSINESS_OWNER && user.profileId) {
      const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { ownerProfileId: true } });
      if (business?.ownerProfileId === user.profileId) return true;
    }
    return this.isActiveStaff(user.id, businessId);
  }

  async list(user: AuthUser, businessId: string) {
    await this.assertOwner(user, businessId);
    const rows = await this.prisma.merchantEmployee.findMany({
      where: { businessId, status: { not: EmployeeStatus.REVOKED } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((e) => ({
      id: e.id,
      email: e.email,
      role: e.role,
      status: e.status,
      inviteExpiresAt: e.status === EmployeeStatus.INVITED ? e.inviteExpiresAt : null,
      acceptedAt: e.acceptedAt,
    }));
  }

  async invite(user: AuthUser, businessId: string, email: string, role: EmployeeRole) {
    const business = await this.assertOwner(user, businessId);
    const normalized = email.toLowerCase().trim();
    if (!this.mail || !this.mail.isConfigured() || !this.mail.supports('EMAIL')) {
      throw new ServiceUnavailableException('E-mail versturen is tijdelijk niet beschikbaar');
    }
    const owner = await this.prisma.user.findFirst({
      where: { businessOwnerProfile: { id: business.ownerProfileId } },
      select: { email: true },
    });
    if (owner?.email?.toLowerCase() === normalized) {
      throw new BadRequestException('Je kunt jezelf niet uitnodigen');
    }
    const existing = await this.prisma.merchantEmployee.findUnique({
      where: { businessId_email: { businessId, email: normalized } },
    });
    if (existing && existing.status === EmployeeStatus.ACTIVE) {
      throw new ConflictException('Deze medewerker heeft al toegang');
    }
    if (!existing) {
      const count = await this.prisma.merchantEmployee.count({ where: { businessId, status: { not: EmployeeStatus.REVOKED } } });
      if (count >= MAX_EMPLOYEES_PER_SHOP) throw new BadRequestException('Maximaal aantal medewerkers bereikt');
    }

    const token = randomBytes(32).toString('hex');
    const data = {
      role,
      status: EmployeeStatus.INVITED,
      userId: null,
      acceptedAt: null,
      inviteTokenHash: hashToken(token),
      inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedByUserId: user.id,
    };
    const saved = existing
      ? await this.prisma.merchantEmployee.update({ where: { id: existing.id }, data })
      : await this.prisma.merchantEmployee.create({ data: { businessId, email: normalized, ...data } });

    const base = (this.config.get<string>('FRONTEND_URL') || (this.config.get<string>('CORS_ORIGIN') || 'http://localhost:3000').split(',')[0]).trim().replace(/\/$/, '');
    try {
      await this.mail.send({
        to: normalized,
        channel: 'EMAIL',
        subject: `Uitnodiging om bij ${business.name} te werken op LocalSpotter`,
        text: `Je bent uitgenodigd om als medewerker (${role === EmployeeRole.MANAGER ? 'manager' : 'medewerker'}) voor ${business.name} te werken.\n\nLog in of maak een account met dit e-mailadres en open daarna: ${base}/staff/accept?token=${token}\n\nDe uitnodiging is 7 dagen geldig.`,
      });
    } catch (err) {
      this.logger.warn(`Could not send employee invite (${err instanceof Error ? err.name : 'error'})`);
      throw new ServiceUnavailableException('De uitnodiging kon niet worden verstuurd');
    }
    return { id: saved.id, email: saved.email, role: saved.role, status: saved.status };
  }

  async revoke(user: AuthUser, businessId: string, employeeId: string) {
    await this.assertOwner(user, businessId);
    const row = await this.prisma.merchantEmployee.findFirst({ where: { id: employeeId, businessId } });
    if (!row) throw new NotFoundException('Medewerker niet gevonden');
    await this.prisma.merchantEmployee.update({
      where: { id: row.id },
      data: { status: EmployeeStatus.REVOKED, inviteTokenHash: null, inviteExpiresAt: null },
    });
    return { id: row.id, status: EmployeeStatus.REVOKED };
  }

  /** The logged-in user accepts an invite sent to their own e-mail address. */
  async accept(user: AuthUser, token: string) {
    const invite = await this.prisma.merchantEmployee.findUnique({
      where: { inviteTokenHash: hashToken(token) },
      include: { business: { select: { id: true, name: true } } },
    });
    const valid = invite && invite.status === EmployeeStatus.INVITED && invite.inviteExpiresAt && invite.inviteExpiresAt > new Date();
    if (!invite || !valid) throw new NotFoundException('Uitnodiging is ongeldig of verlopen');
    if (!user.email || user.email.toLowerCase() !== invite.email) {
      throw new ForbiddenException('Deze uitnodiging is voor een ander e-mailadres');
    }
    await this.prisma.merchantEmployee.update({
      where: { id: invite.id },
      data: { userId: user.id, status: EmployeeStatus.ACTIVE, acceptedAt: new Date(), inviteTokenHash: null, inviteExpiresAt: null },
    });
    return { businessId: invite.business.id, businessName: invite.business.name };
  }

  async myShops(user: AuthUser) {
    const rows = await this.prisma.merchantEmployee.findMany({
      where: { userId: user.id, status: EmployeeStatus.ACTIVE },
      include: { business: { select: { id: true, name: true, city: true } } },
      orderBy: { acceptedAt: 'asc' },
    });
    return rows.map((r) => ({ businessId: r.business.id, businessName: r.business.name, city: r.business.city, role: r.role }));
  }

  private async assertOwner(user: AuthUser, businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerProfileId: true, deletedAt: true },
    });
    if (!business || business.deletedAt) throw new NotFoundException('Winkel niet gevonden');
    const isOwner = user.role === UserRole.BUSINESS_OWNER && !!user.profileId && business.ownerProfileId === user.profileId;
    if (!isOwner && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Alleen de eigenaar kan medewerkers beheren');
    }
    return business;
  }
}
