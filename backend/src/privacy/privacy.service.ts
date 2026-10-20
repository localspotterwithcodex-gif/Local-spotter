import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatReportStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';

const ANON_NAME = 'Verwijderde gebruiker';
const EXPORT_VERSION = 1;

/**
 * GDPR rights for the logged-in user: export of their own data (art. 15/20) and
 * erasure by anonymisation (art. 17). Every query is scoped to the requester's own ids.
 *
 * Orders and workshop bookings are kept (tax/accounting retention, normally 7 years); only the
 * account itself is anonymised. Delivery addresses stored on orders therefore remain until the
 * retention period ends — this is stated in the privacy policy and in SECURITY.md.
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportMyData(user: AuthUser) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        mobile: true,
        username: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
        consentAcceptedAt: true,
        consentVersion: true,
        oauthAccounts: { select: { provider: true, createdAt: true } },
        notificationPreference: true,
      },
    });
    if (!account) throw new NotFoundException('Account niet gevonden');

    const base = { exportVersion: EXPORT_VERSION, generatedAt: new Date().toISOString(), account };
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { type: true, title: true, message: true, read: true, createdAt: true },
    });

    if (user.role === UserRole.CONSUMER && user.profileId) {
      const profileId = user.profileId;
      const [profile, addresses, orders, reviews, favorites, following, bookings, conversations] = await Promise.all([
        this.prisma.consumerProfile.findUnique({
          where: { id: profileId },
          select: { displayName: true, firstName: true, lastName: true, phone: true, createdAt: true },
        }),
        this.prisma.consumerAddress.findMany({ where: { consumerProfileId: profileId, deletedAt: null } }),
        this.prisma.order.findMany({
          where: { consumerProfileId: profileId },
          orderBy: { createdAt: 'desc' },
          include: { items: true, business: { select: { name: true } } },
        }),
        this.prisma.review.findMany({ where: { consumerProfileId: profileId } }),
        this.prisma.favorite.findMany({
          where: { consumerProfileId: profileId },
          include: { product: { select: { name: true } }, business: { select: { name: true } } },
        }),
        this.prisma.follower.findMany({ where: { consumerProfileId: profileId }, include: { business: { select: { name: true } } } }),
        this.prisma.workshopBooking.findMany({
          where: { consumerProfileId: profileId },
          include: { workshop: { select: { title: true } } },
        }),
        this.prisma.conversation.findMany({
          where: { consumerProfileId: profileId },
          include: {
            business: { select: { name: true } },
            messages: {
              orderBy: { createdAt: 'asc' },
              select: { body: true, fromBusiness: true, createdAt: true, attachment: { select: { url: true } } },
            },
          },
        }),
      ]);
      return { ...base, profile, addresses, orders, reviews, favorites, following, workshopBookings: bookings, conversations, notifications };
    }

    if (user.role === UserRole.BUSINESS_OWNER && user.profileId) {
      const profileId = user.profileId;
      const [profile, businesses, conversations] = await Promise.all([
        this.prisma.businessOwnerProfile.findUnique({ where: { id: profileId }, select: { displayName: true, phone: true, createdAt: true } }),
        this.prisma.business.findMany({
          where: { ownerProfileId: profileId },
          select: {
            id: true, name: true, slug: true, description: true, email: true, phone: true,
            street: true, houseNumber: true, postalCode: true, city: true, status: true, createdAt: true,
          },
        }),
        this.prisma.conversation.findMany({
          where: { business: { ownerProfileId: profileId } },
          include: {
            consumerProfile: { select: { displayName: true } },
            messages: { orderBy: { createdAt: 'asc' }, select: { body: true, fromBusiness: true, createdAt: true } },
          },
        }),
      ]);
      return { ...base, profile, businesses, conversations, notifications };
    }

    return { ...base, notifications };
  }

  /**
   * Anonymises the account and removes personal data that has no legal retention duty.
   * Sign-in is blocked afterwards (status DELETED). Irreversible.
   */
  async deleteMyAccount(user: AuthUser, confirm: string, password?: string) {
    if (confirm !== 'DELETE') throw new BadRequestException('Typ DELETE om te bevestigen');
    if (user.role === UserRole.SUPER_ADMIN) throw new ForbiddenException('Beheerdersaccounts kunnen niet via deze route worden verwijderd');

    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, passwordHash: true, status: true } });
    if (!account || account.status === UserStatus.DELETED) throw new NotFoundException('Account niet gevonden');
    if (account.passwordHash) {
      const ok = password ? await bcrypt.compare(password, account.passwordHash) : false;
      if (!ok) throw new ForbiddenException('Wachtwoord klopt niet');
    }

    if (user.role === UserRole.BUSINESS_OWNER && user.profileId) {
      const shops = await this.prisma.business.count({ where: { ownerProfileId: user.profileId, deletedAt: null } });
      if (shops > 0) {
        throw new ConflictException('Je hebt nog een winkel. Neem contact op met support om eerst je winkel te laten sluiten.');
      }
    }

    const placeholderEmail = `deleted+${user.id}@deleted.invalid`;
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.oAuthAccount.deleteMany({ where: { userId: user.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.notificationPreference.deleteMany({ where: { userId: user.id } });
      await tx.merchantEmployee.deleteMany({ where: { userId: user.id } });

      if (user.role === UserRole.CONSUMER && user.profileId) {
        const profileId = user.profileId;
        await tx.favorite.deleteMany({ where: { consumerProfileId: profileId } });
        await tx.follower.deleteMany({ where: { consumerProfileId: profileId } });
        await tx.cart.deleteMany({ where: { consumerProfileId: profileId } });
        // Conversations go (messages cascade); those under an open moderation report stay until it is resolved.
        await tx.conversation.deleteMany({
          where: { consumerProfileId: profileId, reports: { none: { status: ChatReportStatus.OPEN } } },
        });
        await tx.consumerAddress.updateMany({
          where: { consumerProfileId: profileId },
          data: { deletedAt: now, fullName: ANON_NAME, phone: null, street: '-', houseNumber: null, postalCode: null, city: '-', latitude: null, longitude: null, isDefault: false },
        });
        await tx.consumerProfile.update({
          where: { id: profileId },
          data: { displayName: ANON_NAME, firstName: null, lastName: null, phone: null, profileImageAssetId: null },
        });
      } else if (user.role === UserRole.BUSINESS_OWNER && user.profileId) {
        await tx.businessOwnerProfile.update({
          where: { id: user.profileId },
          data: { displayName: ANON_NAME, phone: null, profileImageAssetId: null },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          email: placeholderEmail,
          mobile: null,
          username: null,
          passwordHash: null,
          status: UserStatus.DELETED,
          deletedAt: now,
          verificationCode: null,
          verificationCodeExpiresAt: null,
          emailVerifiedAt: null,
          mobileVerifiedAt: null,
        },
      });
      await tx.auditLog.create({
        data: { actorUserId: user.id, action: 'ACCOUNT_DELETED', targetType: 'User', targetId: user.id, metadata: { role: user.role } as Prisma.InputJsonValue },
      });
    });
    this.logger.log(`Account ${user.id} anonymised`);
    return { deleted: true };
  }
}
