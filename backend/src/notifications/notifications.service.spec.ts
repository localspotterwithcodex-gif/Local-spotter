import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

const mockNotificationA = {
  id: 'notif-a',
  userId: 'user-a',
  type: 'FOLLOWER',
  title: 'New Follower',
  message: 'User A started following you',
  read: false,
  linkUrl: 'order-123',
  createdAt: new Date(),
};

const mockNotificationB = {
  id: 'notif-b',
  userId: 'user-b',
  type: 'FOLLOWER',
  title: 'New Follower',
  message: 'User A started following you',
  read: false,
  linkUrl: 'order-456',
  createdAt: new Date(),
};

const mockNotificationOrder = {
  id: 'notif-order',
  userId: 'user-a',
  type: 'ORDER',
  title: 'Order Updated',
  message: 'Your order has been updated',
  read: false,
  linkUrl: 'order-789',
  createdAt: new Date(),
};

const mockCreateDto: CreateNotificationDto = {
  type: 'ORDER',
  title: 'Test Notification',
  message: 'Test message',
  linkUrl: 'order-123',
};

describe('NotificationsService', () => {
  // ==========================================
  // NOTIFICATION CREATION
  // ==========================================

  describe('Notification Creation', () => {
    it('should create notification with valid data', async () => {
      const prisma = {
        notification: {
          create: jest.fn().mockResolvedValue(mockNotificationOrder),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get<NotificationsService>(NotificationsService);

      const dto: CreateNotificationDto = {
        type: 'ORDER',
        title: 'Order Updated',
        message: 'Your order has been updated',
        linkUrl: 'order-789',
      };

      const result = await service.createNotification('user-a', dto);

      expect(result.title).toBe('Order Updated');
      expect(result.message).toBe('Your order has been updated');
      expect(result.type).toBe('ORDER');
      expect(result.read).toBe(false);
      expect(result.linkUrl).toBe('order-789');
    });

    it('should handle optional linkUrl', async () => {
      const prisma = {
        notification: {
          create: jest.fn().mockResolvedValue({
            ...mockNotificationOrder,
            linkUrl: null,
          }),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get<NotificationsService>(NotificationsService);

      const dto: CreateNotificationDto = {
        type: 'ORDER',
        title: 'Order Updated',
        message: 'Your order has been updated',
        // linkUrl not provided
      };

      const result = await service.createNotification('user-a', dto);

      expect(result.linkUrl).toBeNull();
    });

    it('should create notification without linkUrl', async () => {
      const prisma = {
        notification: {
          create: jest.fn().mockResolvedValue({
            id: 'notif-c',
            userId: 'user-a',
            type: 'ORDER',
            title: 'Order Updated',
            message: 'Your order has been updated',
            read: false,
            linkUrl: undefined,
            createdAt: new Date(),
          }),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get<NotificationsService>(NotificationsService);

      const dto: CreateNotificationDto = {
        type: 'ORDER',
        title: 'Order Updated',
        message: 'Your order has been updated',
        // linkUrl not provided
      };

      const result = await service.createNotification('user-a', dto);

      expect(result.title).toBe('Order Updated');
      expect(result.type).toBe('ORDER');
      expect(result.linkUrl).toBeUndefined();
    });
  });

  // ==========================================
  // NOTIFICATION LISTING
  // ==========================================

  describe('Notification Listing', () => {
    it('should return authenticated user\'s notifications', async () => {
      const prisma = {
        notification: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([mockNotificationOrder]),
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          count: jest.fn().mockResolvedValue(1),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get<NotificationsService>(NotificationsService);

      const result = await service.getNotifications('user-a');

      expect(result.notifications.length).toBe(1);
      expect(result.notifications[0].id).toBe('notif-order');
      expect(result.unreadCount).toBe(1);
    });

    it('should return empty list when user has no notifications', async () => {
      const prisma = {
        notification: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          count: jest.fn().mockResolvedValue(0),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get<NotificationsService>(NotificationsService);

      const result = await service.getNotifications('user-a');

      expect(result.notifications.length).toBe(0);
      expect(result.unreadCount).toBe(0);
    });
  });

  // ==========================================
  // OWNERSHIP ENFORCEMENT
  // ==========================================

  describe('Ownership Enforcement', () => {
    it('User A CANNOT access User B\'s notification', async () => {
      const prisma = {
        notification: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn().mockResolvedValue(mockNotificationB),
          update: jest.fn(),
          updateMany: jest.fn(),
          count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get<NotificationsService>(NotificationsService);

      await expect(
        service.markNotificationRead('notif-b', 'user-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('User A CANNOT mark User B notification as read', async () => {
      const prisma = {
        notification: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn().mockResolvedValue(mockNotificationB),
          update: jest.fn(),
          updateMany: jest.fn(),
          count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = module.get<NotificationsService>(NotificationsService);

      await expect(
        service.markNotificationRead('notif-b', 'user-a'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});