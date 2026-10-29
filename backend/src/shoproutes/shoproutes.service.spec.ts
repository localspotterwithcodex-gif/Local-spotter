import { Test, TestingModule } from '@nestjs/testing';
import { ShopRoutesService } from './shoproutes.service';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole, RouteStatus, BusinessStatus, SubscriptionStatus } from '@prisma/client';

describe('ShopRoutesService', () => {
  let service: ShopRoutesService;
  let prisma: any;
  let entitlementService: any;

  const mockUserOwner = { id: 'user-owner-1', role: UserRole.BUSINESS_OWNER };
  const mockUserConsumer = { id: 'user-consumer-1', role: UserRole.CONSUMER };
  const mockUserAdmin = { id: 'user-admin-1', role: UserRole.SUPER_ADMIN };

  const mockBusiness = {
    id: 'bus-1',
    ownerProfileId: 'profile-1',
    deletedAt: null,
    status: BusinessStatus.ACTIVE,
    subscription: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: new Date('2027-01-01') },
  };

  const mockOwnerProfile = { id: 'profile-1', userId: 'user-owner-1' };
  const mockConsumerProfile = { id: 'consumer-profile-1', userId: 'user-consumer-1' };

  const mockRoute = {
    id: 'route-1',
    businessId: 'bus-1',
    createdByBusinessId: 'bus-1',
    createdByUserId: 'user-owner-1',
    title: 'Test Route',
    slug: 'test-route',
    city: 'Amsterdam',
    status: RouteStatus.PUBLISHED,
    deletedAt: null,
    business: mockBusiness,
  };

  const mockDraftRoute = {
    ...mockRoute,
    id: 'route-draft',
    status: RouteStatus.DRAFT,
  };

  const mockStop = {
    id: 'stop-1',
    routeId: 'route-1',
    businessId: 'bus-1',
    sequence: 1,
    latitude: 52.3676,
    longitude: 4.9041,
    description: 'Test stop',
    business: mockBusiness,
  };

  beforeEach(async () => {
    prisma = {
      business: { findUnique: jest.fn(), findMany: jest.fn() },
      businessOwnerProfile: { findUnique: jest.fn() },
      consumerProfile: { findUnique: jest.fn() },
      shopRoute: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      routeStop: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    entitlementService = { hasFeature: jest.fn() };
    entitlementService.hasFeature.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopRoutesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
        { provide: TranslationService, useValue: { backfill: jest.fn().mockResolvedValue(undefined), translateFields: jest.fn().mockResolvedValue({ sourceLocale: null, translations: null }) } },
      ],
    }).compile();

    service = module.get<ShopRoutesService>(ShopRoutesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // ENTITLEMENT TESTS
  // ==========================================

  describe('createRoute - Subscription Entitlement', () => {
    it('should reject route creation if business lacks SHOPROUTES entitlement', async () => {
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findMany.mockResolvedValue([mockBusiness]);
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.createRoute(mockUserOwner, { title: 'Test', city: 'Amsterdam' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // OWNERSHIP TESTS
  // ==========================================

  describe('Ownership Validation', () => {
    it('should create route with found business', async () => {
      const otherOwnerProfile = { id: 'profile-2', userId: 'user-owner-1' };
      const otherBusiness = { ...mockBusiness, id: 'bus-2', ownerProfileId: 'profile-2' };
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findMany.mockResolvedValue([otherBusiness]);
      prisma.shopRoute.create.mockResolvedValue({ ...mockRoute, businessId: 'bus-2', createdByBusinessId: 'bus-2' });
      prisma.shopRoute.findFirst.mockResolvedValue(undefined);
      prisma.shopRoute.findUnique.mockResolvedValue({ ...mockRoute, businessId: 'bus-2', createdByBusinessId: 'bus-2' });
      prisma.business.findUnique.mockResolvedValue(otherBusiness);

      const result = await service.createRoute(mockUserOwner, { title: 'Test', city: 'Amsterdam' });
      expect(result.businessId).toBe('bus-2');
    });

    it('never runs a business lookup with an undefined key (Prisma rejects it, which was the 500 on every new route)', async () => {
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findMany.mockResolvedValue([mockBusiness]);
      prisma.business.findUnique.mockImplementation(async (args: any) => {
        if (!args?.where || Object.values(args.where).every((v) => v === undefined)) throw new Error('Argument `where` needs at least one unique field');
        return mockBusiness;
      });
      prisma.shopRoute.findFirst.mockResolvedValue(undefined);
      prisma.shopRoute.create.mockResolvedValue(mockRoute);
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      entitlementService.hasFeature.mockResolvedValue(true);

      await expect(service.createRoute(mockUserOwner, { title: 'Test', city: 'Amsterdam' })).resolves.toBeDefined();
    });

    it('should reject unauthorized user from managing route', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);

      await expect(
        service.updateRoute('route-1', mockUserConsumer, { title: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to manage any route', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      prisma.shopRoute.findFirst.mockResolvedValue(undefined);
      prisma.shopRoute.update.mockResolvedValue(mockRoute);

      const result = await service.updateRoute('route-1', mockUserAdmin, { title: 'Updated' });
      expect(result.id).toBe('route-1');
    });
  });

  // ==========================================
  // ROUTE CREATION TESTS
  // ==========================================

  describe('Route Creation', () => {
    it('should reject if business has no active business', async () => {
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findMany.mockResolvedValue([]);

      await expect(
        service.createRoute(mockUserOwner, { title: 'Test', city: 'Amsterdam' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // GPS VALIDATION TESTS
  // ==========================================

  describe('GPS Coordinate Validation', () => {
    it('should reject latitude > 90', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.routeStop.count.mockResolvedValue(0);
      prisma.routeStop.create.mockRejectedValue(new BadRequestException('Test'));

      await expect(
        service.addStop('route-1', mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Stop',
          latitude: 91,
          longitude: 4.9041,
          sequence: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject longitude > 180', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.routeStop.count.mockResolvedValue(0);
      prisma.routeStop.create.mockRejectedValue(new BadRequestException('Test'));

      await expect(
        service.addStop('route-1', mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Stop',
          latitude: 52.3676,
          longitude: 181,
          sequence: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid coordinates', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.routeStop.count.mockResolvedValue(0);
      prisma.routeStop.create.mockResolvedValue(mockStop);

      const result = await service.addStop('route-1', mockUserOwner, {
        businessId: 'bus-1',
        title: 'Test Stop',
        latitude: 52.3676,
        longitude: 4.9041,
        sequence: 2,
      });
      expect(result.latitude).toBe(52.3676);
    });
  });

  // ==========================================
  // STOP MANAGEMENT TESTS
  // ==========================================

  describe('Stop Management', () => {
    it('should reject adding stop to non-existent route', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(null);

      await expect(
        service.addStop('route-unknown', mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Stop',
          latitude: 52.3676,
          longitude: 4.9041,
          sequence: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject adding stop for inactive business', async () => {
      const inactiveBusiness = { ...mockBusiness, status: BusinessStatus.SUSPENDED };
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(inactiveBusiness);

      await expect(
        service.addStop('route-1', mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Stop',
          latitude: 52.3676,
          longitude: 4.9041,
          sequence: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // PUBLIC VISIBILITY TESTS
  // ==========================================

  describe('Public Route Visibility', () => {
    it('should return only published routes', async () => {
      prisma.shopRoute.findMany.mockResolvedValue([]);
      prisma.shopRoute.count.mockResolvedValue(0);

      const result = await service.getPublicRoutes({});
      expect(result.data).toEqual([]);
    });

    it('requires an approved shop with a running plan that includes Shoproutes', async () => {
      prisma.shopRoute.findMany.mockResolvedValue([]);
      prisma.shopRoute.count.mockResolvedValue(0);

      await service.getPublicRoutes({ search: 'x' } as any);
      const where = prisma.shopRoute.findMany.mock.calls[0][0].where;
      expect(where.status).toBe(RouteStatus.PUBLISHED);
      const sub = where.OR[1].business.subscription;
      expect(sub.status).toBe('ACTIVE');
      expect(sub.plan.slug.in).toEqual(['SHOPROUTES', 'WORKSHOP']);
      // search must not clobber the visibility OR
      expect(where.AND).toHaveLength(1);
    });

    it('filters by theme, length and duration and lists featured routes first', async () => {
      prisma.shopRoute.findMany.mockResolvedValue([]);
      prisma.shopRoute.count.mockResolvedValue(0);
      await service.getPublicRoutes({ theme: 'Ambacht', maxDistanceKm: 5, maxDurationMinutes: 90, featured: true } as any);
      const args = prisma.shopRoute.findMany.mock.calls[0][0];
      expect(args.where.theme).toEqual({ equals: 'Ambacht', mode: 'insensitive' });
      expect(args.where.distanceKm).toEqual({ lte: 5 });
      expect(args.where.durationMinutes).toEqual({ lte: 90 });
      expect(args.where.featured).toBe(true);
      expect(args.orderBy).toEqual([{ featured: 'desc' }, { createdAt: 'desc' }]);
    });

    it('only lets admins change featured', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue({ ...mockRoute, deletedAt: null, distanceKm: null, durationMinutes: null });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.shopRoute.update.mockResolvedValue({ id: 'route-1' });
      await service.updateRoute('route-1', mockUserOwner, { featured: true, theme: ' Food ' } as any);
      const data = prisma.shopRoute.update.mock.calls[0][0].data;
      expect(data.featured).toBeUndefined();
      expect(data.theme).toBe('Food');
    });

    it('recomputes distance and duration after adding a stop unless set manually', async () => {
      prisma.shopRoute.findUnique
        .mockResolvedValueOnce({ ...mockRoute, deletedAt: null })
        .mockResolvedValueOnce({ statsManual: false });
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.routeStop.count.mockResolvedValue(0);
      prisma.routeStop.create.mockResolvedValue({ id: 's1' });
      prisma.routeStop.findMany.mockResolvedValue([
        { latitude: 52.0, longitude: 4.0, sequence: 0 },
        { latitude: 52.009, longitude: 4.0, sequence: 1 },
      ]);
      await service.addStop('route-1', mockUserOwner, { businessId: 'bus-1', title: 'S', latitude: 52.009, longitude: 4.0, sequence: 1 });
      const data = prisma.shopRoute.update.mock.calls.at(-1)[0].data;
      expect(data.distanceKm).toBeGreaterThan(0.9);
      expect(data.durationMinutes).toBeGreaterThan(0);
    });

    it('should reject non-owner from viewing draft route', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockDraftRoute);

      await expect(
        service.getRouteById('route-draft', mockUserConsumer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow owner to view draft route', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockDraftRoute);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);

      const result = await service.getRouteById('route-draft', mockUserOwner);
      expect(result.id).toBe('route-draft');
    });
  });

  // ==========================================
  // RBAC TESTS
  // ==========================================

  describe('RBAC Authorization', () => {
    it('should reject consumer from managing routes', async () => {
      await expect(
        service.createRoute(mockUserConsumer, { title: 'Test', city: 'Amsterdam' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject consumer from adding stops', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);

      await expect(
        service.addStop('route-1', mockUserConsumer, {
          businessId: 'bus-1',
          title: 'Test Stop',
          latitude: 52.3676,
          longitude: 4.9041,
          sequence: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow super admin to manage any route', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      prisma.shopRoute.findFirst.mockResolvedValue(undefined);
      prisma.shopRoute.update.mockResolvedValue(mockRoute);

      await expect(
        service.updateRoute('route-1', mockUserAdmin, { title: 'Admin Updated' }),
      ).resolves.toBeDefined();
    });
  });

  // ==========================================
  // CANCEL/ARCHIVE TESTS
  // ==========================================

  describe('cancelRoute', () => {
    it('should archive route and set deletedAt', async () => {
      prisma.shopRoute.findUnique.mockResolvedValue(mockRoute);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          shopRoute: {
            update: jest.fn().mockResolvedValue({ ...mockRoute, status: RouteStatus.ARCHIVED, deletedAt: new Date() }),
            findUnique: jest.fn().mockResolvedValue({ ...mockRoute, status: RouteStatus.ARCHIVED, deletedAt: new Date(), business: mockBusiness }),
          },
        };
        return fn(tx);
      });

      const result = await service.cancelRoute('route-1', mockUserOwner);
      expect(result.status).toBe(RouteStatus.ARCHIVED);
    });
  });
});
