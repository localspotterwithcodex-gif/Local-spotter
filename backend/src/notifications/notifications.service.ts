import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

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