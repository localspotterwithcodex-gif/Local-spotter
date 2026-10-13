import { Test, TestingModule } from '@nestjs/testing';
import { WorkshopsService } from './workshops.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole, WorkshopStatus, BookingStatus, BusinessStatus, SubscriptionStatus } from '@prisma/client';

describe('WorkshopsService', () => {
  let service: WorkshopsService;
  let prisma: any;
  let entitlementService: any;
  let mockTx: any;

  const mockUserOwner = {
    id: 'user-owner-1',
    role: UserRole.BUSINESS_OWNER,
  };

  const mockUserConsumer = {
    id: 'user-consumer-1',
    role: UserRole.CONSUMER,
  };

  const mockUserAdmin = {
    id: 'user-admin-1',
    role: UserRole.SUPER_ADMIN,
  };

  const mockBusiness = {
    id: 'bus-1',
    ownerProfileId: 'profile-1',
    deletedAt: null,
    status: BusinessStatus.ACTIVE,
  };

  const mockOwnerProfile = {
    id: 'profile-1',
    userId: 'user-owner-1',
  };

  const mockConsumerProfile = {
    id: 'consumer-profile-1',
    userId: 'user-consumer-1',
  };

  const mockWorkshop = {
    id: 'workshop-1',
    businessId: 'bus-1',
    title: 'Test Workshop',
    slug: 'test-workshop',
    price: 25.00,
    capacity: 10,
    bookedCount: 3,
    startTime: new Date('2027-01-15T10:00:00Z'),
    endTime: new Date('2027-01-15T13:00:00Z'),
    status: WorkshopStatus.PUBLISHED,
    deletedAt: null,
    business: { ...mockBusiness, ownerProfileId: 'profile-1' },
  };

  const mockFullWorkshop = {
    ...mockWorkshop,
    id: 'workshop-full',
    capacity: 5,
    bookedCount: 5,
    status: WorkshopStatus.FULL,
  };

  beforeEach(async () => {
    mockTx = {
      workshop: { findUnique: jest.fn(), update: jest.fn() },
      business: { findUnique: jest.fn() },
      consumerProfile: { findUnique: jest.fn() },
      $executeRaw: jest.fn(),
      workshopBooking: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    };

    prisma = {
      business: { findUnique: jest.fn() },
      businessOwnerProfile: { findUnique: jest.fn() },
      consumerProfile: { findUnique: jest.fn() },
      workshop: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      workshopBooking: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
    };

    prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
    prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);

    prisma.$transaction.mockImplementation(async (fn) => {
      return fn(mockTx);
    });

    entitlementService = { hasFeature: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkshopsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
      ],
    }).compile();

    service = module.get<WorkshopsService>(WorkshopsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================
  // SUBSCRIPTION ENTITLEMENT TESTS
  // ==========================================

  describe('createWorkshop - Subscription Entitlement', () => {
    it('should reject workshop creation if business does not have WORKSHOPS entitlement', async () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.createWorkshop(mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Workshop',
          price: 25,
          capacity: 10,
          startTime: '2026-02-01T10:00:00Z',
          endTime: '2026-02-01T13:00:00Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject workshop creation if user is not a business owner', async () => {
      await expect(
        service.createWorkshop(mockUserConsumer, {
          businessId: 'bus-1',
          title: 'Test Workshop',
          price: 25,
          capacity: 10,
          startTime: '2026-02-01T10:00:00Z',
          endTime: '2026-02-01T13:00:00Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('WORKSHOP Entitlement Validation', () => {
    it('should reject if business has only WEBSHOP subscription', async () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.createWorkshop(mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Workshop',
          price: 25,
          capacity: 10,
          startTime: '2026-02-01T10:00:00Z',
          endTime: '2026-02-01T13:00:00Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // OWNERSHIP VALIDATION TESTS
  // ==========================================

  describe('Ownership Validation', () => {
    it('should reject creating workshop for another owner business', async () => {
      const otherBusiness = { ...mockBusiness, id: 'bus-2', ownerProfileId: 'profile-2' };
      prisma.business.findUnique.mockResolvedValue(otherBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      await expect(
        service.createWorkshop(mockUserOwner, {
          businessId: 'bus-2',
          title: 'Test Workshop',
          price: 25,
          capacity: 10,
          startTime: '2026-02-01T10:00:00Z',
          endTime: '2026-02-01T13:00:00Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject updating another owner workshop', async () => {
      const otherWorkshop = {
        ...mockWorkshop,
        id: 'workshop-other',
        businessId: 'bus-2',
        business: { ...mockBusiness, id: 'bus-2', ownerProfileId: 'profile-2' },
      };
      prisma.workshop.findUnique.mockResolvedValue(otherWorkshop);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      await expect(
        service.updateWorkshop('workshop-other', mockUserOwner, { title: 'Hacked Title' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // DATE VALIDATION TESTS
  // ==========================================

  describe('Date Validation', () => {
    it('should reject if start time is in the past', async () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      entitlementService.hasFeature.mockResolvedValue(true);

      await expect(
        service.createWorkshop(mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Workshop',
          price: 25,
          capacity: 10,
          startTime: '2025-01-01T10:00:00Z',
          endTime: '2025-01-01T13:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if end time is before start time', async () => {
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      entitlementService.hasFeature.mockResolvedValue(true);

      await expect(
        service.createWorkshop(mockUserOwner, {
          businessId: 'bus-1',
          title: 'Test Workshop',
          price: 25,
          capacity: 10,
          startTime: '2026-02-01T13:00:00Z',
          endTime: '2026-02-01T10:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // CAPACITY VALIDATION TESTS
  // ==========================================

  describe('Capacity Validation', () => {
    it('should reject reducing capacity below booked count', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      await expect(
        service.updateWorkshop('workshop-1', mockUserOwner, { capacity: 2 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // PUBLIC LISTING FILTERS
  // ==========================================

  describe('Public Listing Filters', () => {
    it('should filter out draft workshops from public listing', async () => {
      const draftWorkshop = { ...mockWorkshop, status: WorkshopStatus.DRAFT };
      prisma.workshop.findMany.mockResolvedValue([]);
      prisma.workshop.count.mockResolvedValue(0);

      const result = await service.getPublicWorkshops({});
      expect(result.data).toEqual([]);
    });

    it('should filter out cancelled workshops from public listing', async () => {
      const cancelledWorkshop = { ...mockWorkshop, status: WorkshopStatus.CANCELLED };
      prisma.workshop.findMany.mockResolvedValue([]);
      prisma.workshop.count.mockResolvedValue(0);

      const result = await service.getPublicWorkshops({});
      expect(result.data).toEqual([]);
    });
  });

  // ==========================================
  // TRANSACTIONAL BOOKING TESTS
  // ==========================================

  describe('createBooking - Transactional Booking', () => {
    it('should create booking with price snapshot', async () => {
      mockTx.workshop.findUnique.mockResolvedValue({ ...mockWorkshop, business: mockBusiness });
      mockTx.workshop.update.mockResolvedValue({ ...mockWorkshop, capacity: 10, bookedCount: 5 });
      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.workshopBooking.create.mockResolvedValue({
        id: 'booking-1',
        workshopId: 'workshop-1',
        ticketQuantity: 2,
        unitPrice: 25.00,
        totalAmount: 50.00,
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 });

      expect(result.unitPrice).toBe(25.00);
      expect(result.totalAmount).toBe(50.00);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(result.workshop).toBeDefined();
    });

    it('should throw ConflictException when capacity is exceeded', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ ...mockWorkshop, capacity: 5, bookedCount: 4 });
      mockTx.workshop.findUnique.mockResolvedValue({ ...mockWorkshop, capacity: 5, bookedCount: 4 });
      mockTx.$executeRaw.mockResolvedValue(0);

      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if workshop is not PUBLISHED', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ ...mockWorkshop, status: WorkshopStatus.DRAFT });
      mockTx.workshop.findUnique.mockResolvedValue({ ...mockWorkshop, status: WorkshopStatus.DRAFT });

      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if business lacks WORKSHOPS entitlement', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      mockTx.workshop.findUnique.mockResolvedValue(mockWorkshop);
      entitlementService.hasFeature.mockResolvedValue(false);

      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // CONSUMER BOOKING ISOLATION TESTS
  // ==========================================

  describe('Consumer Booking Isolation', () => {
    it('should reject viewing another consumer booking', async () => {
      const otherConsumerBooking = {
        id: 'booking-other',
        consumerProfileId: 'consumer-profile-2',
        workshopId: 'workshop-1',
        ticketQuantity: 1,
        totalAmount: 25.00,
        status: BookingStatus.CONFIRMED,
        workshop: mockWorkshop,
        business: mockBusiness,
        consumerProfile: { id: 'consumer-profile-2', displayName: 'Other' },
      };
      prisma.workshopBooking.findUnique.mockResolvedValue(otherConsumerBooking);
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);

      await expect(
        service.getBookingById('booking-other', mockUserConsumer),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // BUSINESS OWNER BOOKING ACCESS TESTS
  // ==========================================

  describe('Business Owner Booking Access', () => {
    it('should reject owner viewing another business bookings', async () => {
      const otherBusiness = { ...mockBusiness, id: 'bus-2', ownerProfileId: 'profile-2' };
      const otherWorkshop = { ...mockWorkshop, businessId: 'bus-2', business: otherBusiness };
      const otherBooking = {
        id: 'booking-other',
        consumerProfileId: 'consumer-profile-1',
        workshopId: 'workshop-1',
        ticketQuantity: 1,
        totalAmount: 25.00,
        status: BookingStatus.CONFIRMED,
        workshop: otherWorkshop,
        business: otherBusiness,
        consumerProfile: mockConsumerProfile,
      };
      prisma.workshopBooking.findUnique.mockResolvedValue(otherBooking);
      prisma.business.findUnique.mockResolvedValue(otherBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      await expect(
        service.getBookingById('booking-other', mockUserOwner),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // BOOKING CANCELLATION TESTS
  // ==========================================

  describe('cancelBooking - Cancellation with Capacity Restore', () => {
    it('should successfully cancel booking and restore seats', async () => {
      const booking = {
        id: 'booking-1',
        workshopId: 'workshop-1',
        consumerProfileId: 'consumer-profile-1',
        ticketQuantity: 2,
        unitPrice: 25.00,
        totalAmount: 50.00,
        status: BookingStatus.CONFIRMED,
        workshop: { ...mockWorkshop, status: WorkshopStatus.FULL },
        business: mockBusiness,
        consumerProfile: mockConsumerProfile,
      };
      prisma.workshopBooking.findUnique.mockResolvedValue(booking);
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      const cancelledBooking = { ...booking, status: BookingStatus.CANCELLED };
      mockTx.workshopBooking.update.mockResolvedValue(cancelledBooking);
      mockTx.workshopBooking.findUnique.mockResolvedValue(cancelledBooking);
      mockTx.workshop.update.mockResolvedValue({ ...mockWorkshop, bookedCount: 1 });
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      const result = await service.cancelBooking('booking-1', mockUserConsumer);
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });

  // ==========================================
  // WORKSHOP GET BY ID TESTS
  // ==========================================

  describe('getWorkshopById - RBAC', () => {
    it('should return workshop for owner', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);

      const result = await service.getWorkshopById('workshop-1', mockUserOwner);
      expect(result.id).toBe('workshop-1');
    });

    it('should return workshop for admin', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);

      const result = await service.getWorkshopById('workshop-1', mockUserAdmin);
      expect(result.id).toBe('workshop-1');
    });
  });
});
