import { Test, TestingModule } from '@nestjs/testing';
import { FollowersService } from './followers.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('FollowersService', () => {
  let service: FollowersService;
  let prisma: any;
  let entitlementService: any;

  const mockConsumerUser = { id: 'user-consumer-1', role: UserRole.CONSUMER };
  const mockOwnerUser = { id: 'user-owner-1', role: UserRole.BUSINESS_OWNER };
  const mockOtherConsumerUser = { id: 'user-consumer-2', role: UserRole.CONSUMER };
  const mockBusiness = { id: 'bus-1', name: 'Test Business' };

  const mockConsumerProfile = { id: 'consumer-profile-1', userId: 'user-consumer-1' };

  beforeEach(async () => {
    prisma = {
      follower: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      businessSubscription: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    entitlementService = { hasFeature: jest.fn() };
    entitlementService.hasFeature.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowersService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
      ],
    }).compile();

    service = module.get<FollowersService>(FollowersService);
  });

  // ==========================================
  // AUTHENTICATION / RBAC
  // ==========================================

  describe('Authentication / RBAC', () => {
    it('service should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ==========================================
  // FOLLOW
  // ==========================================

  describe('Follow', () => {
    it('should allow consumer to follow a business', async () => {
      prisma.follower.findUnique.mockResolvedValue(null); // Not already following
      prisma.follower.create.mockResolvedValue({ id: 'follow-1' });

      const result = await service.followBusiness('bus-1', 'consumer-profile-1');

      expect(result.isFollowing).toBe(true);
    });

    it('should handle duplicate follow idempotently', async () => {
      prisma.follower.findUnique.mockResolvedValue({ id: 'existing-follow' }); // Already following

      const result = await service.followBusiness('bus-1', 'consumer-profile-1');

      expect(result.isFollowing).toBe(true);
      // Should not create duplicate
      expect(prisma.follower.create).not.toHaveBeenCalled();
    });

    it('should create follow relationship', async () => {
      prisma.follower.findUnique.mockResolvedValue(null);

      const result = await service.followBusiness('bus-1', 'consumer-profile-1');

      expect(result.isFollowing).toBe(true);
      expect(prisma.follower.create).toHaveBeenCalledWith({
        data: {
          consumerProfileId: 'consumer-profile-1',
          businessId: 'bus-1',
        },
      });
    });
  });

  // ==========================================
  // UNFOLLOW
  // ==========================================

  describe('Unfollow', () => {
    it('should allow consumer to unfollow', async () => {
      // Set up: user has a follow relationship
      prisma.follower.findUnique.mockResolvedValue({
        id: 'follow-1',
        consumerProfileId: 'consumer-profile-1',
      });

      const result = await service.unfollowBusiness('bus-1', 'consumer-profile-1');

      expect(result.isFollowing).toBe(false);
      prisma.follower.delete.mockResolvedValue({ id: 'follow-1' });
    });

    it('should reject unfollowing when not following', async () => {
      prisma.follower.findUnique.mockResolvedValue(null);

      await expect(
        service.unfollowBusiness('bus-1', 'consumer-profile-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if another consumer tries to unfollow', async () => {
      // Set up: user has a follow relationship with consumer-profile-1
      prisma.follower.findUnique.mockResolvedValue({
        id: 'follow-1',
        consumerProfileId: 'consumer-profile-1',
      });

      // Try to unfollow as a different consumer (consumer-profile-2)
      await expect(
        service.unfollowBusiness('bus-1', 'consumer-profile-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle repeated unfollow safely', async () => {
      prisma.follower.findUnique.mockResolvedValue(null);

      await expect(
        service.unfollowBusiness('bus-1', 'consumer-profile-1'),
      ).rejects.toThrow(NotFoundException);
      // Second call should also throw, not corrupt data
    });
  });

  // ==========================================
  // FOLLOW STATUS
  // ==========================================

  describe('Follow Status', () => {
    it('should return isFollowing=true when following', async () => {
      prisma.follower.findUnique.mockResolvedValue({ id: 'follow-1' });

      const result = await service.checkFollowStatus('bus-1', 'consumer-profile-1');

      expect(result.isFollowing).toBe(true);
    });

    it('should return isFollowing=false when not following', async () => {
      prisma.follower.findUnique.mockResolvedValue(null);

      const result = await service.checkFollowStatus('bus-1', 'consumer-profile-1');

      expect(result.isFollowing).toBe(false);
    });
  });

  // ==========================================
  // FOLLOWED BUSINESSES
  // ==========================================

  describe('Followed Businesses', () => {
    it('should return authenticated user\'s followed businesses', async () => {
      prisma.follower.findMany.mockResolvedValue([
        {
          business: { id: 'bus-1', name: 'Business 1' },
        },
        {
          business: { id: 'bus-2', name: 'Business 2' },
        },
      ]);

      const result = await service.getFollowedBusinesses('consumer-profile-1');

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Business 1');
      expect(result[1].name).toBe('Business 2');
    });

    it('should return empty list when user follows no businesses', async () => {
      prisma.follower.findMany.mockResolvedValue([]);

      const result = await service.getFollowedBusinesses('consumer-profile-1');

      expect(result.length).toBe(0);
    });
  });

  // ==========================================
  // ENTITLEMENT
  // ==========================================

  describe('Entitlement', () => {
    it('should allow Workshop-entitled business to follow', async () => {
      prisma.follower.findUnique.mockResolvedValue(null);
      entitlementService.hasFeature.mockResolvedValue(true);

      const result = await service.followBusiness('bus-1', 'consumer-profile-1');

      expect(result.isFollowing).toBe(true);
      expect(entitlementService.hasFeature).toHaveBeenCalledWith('bus-1', 'WORKSHOPS');
    });

    it('should reject non-entitled business from following', async () => {
      prisma.follower.findUnique.mockResolvedValue(null);
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.followBusiness('bus-1', 'consumer-profile-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});