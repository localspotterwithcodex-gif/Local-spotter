import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

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