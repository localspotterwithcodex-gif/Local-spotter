import {
  Inject,
  Injectable,
  Logger,
  Optional,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { NotificationType, SubscriptionStatus } from '@prisma/client';
import { MAIL_PROVIDER, MailProvider } from '../mail/mail.provider';
import { GuestLinkService } from '../guest/guest-link.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(MAIL_PROVIDER) private mail?: MailProvider,
    @Optional() private guests?: GuestLinkService,
  ) {}

  async getPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return {
      notifyOrders: pref?.notifyOrders ?? true,
      notifyReviews: pref?.notifyReviews ?? true,
      notifyTips: pref?.notifyTips ?? true,
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const data = {
      ...(dto.notifyOrders !== undefined ? { notifyOrders: dto.notifyOrders } : {}),
      ...(dto.notifyReviews !== undefined ? { notifyReviews: dto.notifyReviews } : {}),
      ...(dto.notifyTips !== undefined ? { notifyTips: dto.notifyTips } : {}),
    };
    const pref = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return { notifyOrders: pref.notifyOrders, notifyReviews: pref.notifyReviews, notifyTips: pref.notifyTips };
  }

  /**
   * Best-effort in-app notification to the owner of a business, honouring their
   * preferences. Never throws: a failed notification must not fail an order or review.
   */
  async notifyBusinessOwner(
    businessId: string,
    kind: 'ORDER' | 'REVIEW',
    title: string,
    message: string,
    linkUrl?: string,
  ): Promise<void> {
    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { ownerProfile: { select: { userId: true } } },
      });
      const ownerUserId = business?.ownerProfile?.userId;
      if (!ownerUserId) return;
      const prefs = await this.getPreferences(ownerUserId);
      if (kind === 'ORDER' && !prefs.notifyOrders) return;
      if (kind === 'REVIEW' && !prefs.notifyReviews) return;
      await this.prisma.notification.create({
        data: {
          userId: ownerUserId,
          type: kind === 'ORDER' ? NotificationType.ORDER : NotificationType.REVIEW,
          title,
          message,
          linkUrl,
          read: false,
        },
      });
    } catch (err) {
      this.logger.warn(`Could not create ${kind} notification: ${(err as Error).message}`);
    }
  }

  /**
   * Best-effort in-app notification (and optional email) to any user. Never throws:
   * a failed notification must not fail the booking/cancellation that caused it.
   */
  async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: { linkUrl?: string; email?: boolean } = {},
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { userId, type, title, message, linkUrl: options.linkUrl, read: false },
      });
    } catch (err) {
      this.logger.warn(`Could not create ${type} notification: ${(err as Error).message}`);
    }
    if (!options.email || !this.mail || !this.mail.isConfigured() || !this.mail.supports('EMAIL')) return;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, guestEmail: true, isGuest: true } });
      // Guests have no login: mail goes to their contact address and carries a personal order link.
      const to = user?.email ?? user?.guestEmail;
      if (!to) return;
      let text = message;
      if (user?.isGuest && this.guests) {
        const link = await this.guests.orderLinkFor(userId);
        if (link) text += `\n\nBekijk je bestelling via je persoonlijke link (7 dagen geldig):\n${link}`;
      }
      await this.mail.send({ to, channel: 'EMAIL', subject: title, text });
    } catch (err) {
      this.logger.warn(`Could not email ${type} notification: ${(err as Error).message}`);
    }
  }

  /**
   * Reminds owners whose subscription period ends within `days` days (once per period).
   * Called by the scheduled job endpoint; best effort per subscription.
   */
  async sendSubscriptionExpiryReminders(now = new Date(), days = 7): Promise<{ reminded: number }> {
    const horizon = new Date(now.getTime() + days * 86_400_000);
    const candidates = await this.prisma.businessSubscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: { gt: now, lte: horizon } },
      take: 500,
      select: {
        id: true,
        currentPeriodEnd: true,
        expiryReminderForEnd: true,
        autoRenew: true,
        business: { select: { name: true, ownerProfile: { select: { userId: true } } } },
        plan: { select: { name: true } },
      },
    });
    let reminded = 0;
    for (const sub of candidates) {
      const already = sub.expiryReminderForEnd && sub.expiryReminderForEnd.getTime() === sub.currentPeriodEnd.getTime();
      const userId = sub.business?.ownerProfile?.userId;
      if (already || !userId) continue;
      // Claim first so a retry never double-sends.
      const claim = await this.prisma.businessSubscription.updateMany({
        where: { id: sub.id, OR: [{ expiryReminderForEnd: null }, { expiryReminderForEnd: { not: sub.currentPeriodEnd } }] },
        data: { expiryReminderForEnd: sub.currentPeriodEnd },
      });
      if (claim.count !== 1) continue;
      await this.notifyUser(
        userId,
        NotificationType.SUBSCRIPTION,
        `Je abonnement ${sub.plan.name} loopt bijna af`,
        `Het abonnement van ${sub.business.name} eindigt op ${sub.currentPeriodEnd.toISOString().slice(0, 10)}. Verleng op tijd zodat je winkel zichtbaar blijft.`,
        { linkUrl: '/owner/subscription', email: true },
      );
      reminded++;
    }
    return { reminded };
  }

  async createNotification(
    userId: string,
    dto: CreateNotificationDto,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        linkUrl: dto.linkUrl,
        read: false,
      },
    });

    return notification;
  }

  async getNotifications(
    userId: string,
    includeRead: boolean = false,
  ) {
    const where = includeRead
      ? {}
      : { read: false };

    const notifications = await this.prisma.notification.findMany({
      where: { userId, ...where },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  async markNotificationRead(
    notificationId: string,
    userId: string,
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificatie niet gevonden');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'Je kunt alleen je eigen notificaties markeren als gelezen',
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return updated;
  }

  async markAllNotificationsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { modifiedCount: result.count };
  }
}