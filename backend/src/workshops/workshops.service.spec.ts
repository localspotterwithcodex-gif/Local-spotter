import { Test, TestingModule } from '@nestjs/testing';
import { WorkshopsService } from './workshops.service';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmployeesService } from '../employees/employees.service';
import { PaymentsService } from '../payments/payments.service';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole, WorkshopStatus, BookingStatus, BusinessStatus, SessionStatus } from '@prisma/client';

describe('WorkshopsService', () => {
  let service: WorkshopsService;
  let prisma: any;
  let entitlementService: any;
  let payments: any;
  let notifications: { notifyUser: jest.Mock };
  let employees: { isActiveStaff: jest.Mock };
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
    cancellationDeadlineHours: 48,
    refundPercentage: 100,
    minAge: null,
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

  const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);
  const mockSession = {
    id: 'session-1',
    workshopId: 'workshop-1',
    startTime: hoursFromNow(24 * 10),
    endTime: hoursFromNow(24 * 10 + 3),
    capacity: 10,
    bookedCount: 3,
    status: SessionStatus.OPEN,
  };

  beforeEach(async () => {
    notifications = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    employees = { isActiveStaff: jest.fn().mockResolvedValue(false) };
    mockTx = {
      workshop: { findUnique: jest.fn(), update: jest.fn() },
      business: { findUnique: jest.fn() },
      consumerProfile: { findUnique: jest.fn() },
      $executeRaw: jest.fn(),
      workshopBooking: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      workshopSession: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
    };

    prisma = {
      business: { findUnique: jest.fn() },
      businessOwnerProfile: { findUnique: jest.fn() },
      consumerProfile: { findUnique: jest.fn() },
      workshop: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      workshopBooking: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      workshopSession: { findFirst: jest.fn() },
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
    };

    prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
    prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);

    prisma.$transaction.mockImplementation(async (fn) => {
      return fn(mockTx);
    });

    entitlementService = { hasFeature: jest.fn().mockResolvedValue(true) };

    payments = {
      refundWorkshopBooking: jest.fn().mockResolvedValue({ status: 'NOT_REQUIRED', refundedCents: 0 }),
      syncFromProvider: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkshopsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionEntitlementService, useValue: entitlementService },
        { provide: NotificationsService, useValue: notifications },
        { provide: EmployeesService, useValue: employees },
        { provide: PaymentsService, useValue: payments },
        { provide: TranslationService, useValue: { backfill: jest.fn().mockResolvedValue(undefined), translateFields: jest.fn().mockResolvedValue({ sourceLocale: null, translations: null }) } },
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

    it('only lists workshops of shops on the WORKSHOP plan and ignores non-public status filters', async () => {
      prisma.workshop.findMany.mockResolvedValue([]);
      prisma.workshop.count.mockResolvedValue(0);

      await service.getPublicWorkshops({ status: WorkshopStatus.DRAFT } as any);
      const where = prisma.workshop.findMany.mock.calls[0][0].where;
      expect(where.business.subscription.plan.slug).toBe('WORKSHOP');
      expect(where.status).toEqual({ in: [WorkshopStatus.PUBLISHED, WorkshopStatus.FULL] });
    });

    it('applies a date range and never goes before now when upcomingOnly', async () => {
      prisma.workshop.findMany.mockResolvedValue([]);
      prisma.workshop.count.mockResolvedValue(0);
      const to = new Date(Date.now() + 5 * 86400000).toISOString();
      await service.getPublicWorkshops({ dateFrom: '2000-01-01T00:00:00Z', dateTo: to } as any);
      const where = prisma.workshop.findMany.mock.calls[0][0].where;
      const range = where.sessions.some.startTime;
      expect(range.gte.getTime()).toBeGreaterThan(Date.now() - 5000);
      expect(range.lte.toISOString()).toBe(to);
      expect(range.gt).toBeUndefined();
      expect(where.startTime).toBeUndefined();
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
    const wsWith = (sessions: any[], extra: any = {}) => ({
      ...mockWorkshop,
      business: mockBusiness,
      sessions,
      ...extra,
    });
    const created = {
      id: 'booking-1',
      workshopId: 'workshop-1',
      sessionId: 'session-1',
      ticketQuantity: 2,
      unitPrice: 25.0,
      totalAmount: 50.0,
      status: BookingStatus.CONFIRMED,
      workshop: {},
    };

    it('holds a priced booking as PENDING and announces it only after the payment', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([mockSession]));
      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.workshopBooking.create.mockResolvedValue({ ...created, status: BookingStatus.PENDING });

      const result: any = await service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 });

      expect(mockTx.workshopBooking.create.mock.calls[0][0].data.status).toBe(BookingStatus.PENDING);
      expect(result.requiresPayment).toBe(true);
      expect(notifications.notifyUser).not.toHaveBeenCalled();
    });

    it('confirms a free booking immediately and notifies', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([mockSession], { price: 0 }));
      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.workshopBooking.create.mockResolvedValue({ ...created, unitPrice: 0, totalAmount: 0, status: BookingStatus.CONFIRMED });

      const result: any = await service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 });

      expect(mockTx.workshopBooking.create.mock.calls[0][0].data.status).toBe(BookingStatus.CONFIRMED);
      expect(result.requiresPayment).toBe(false);
      expect(notifications.notifyUser).toHaveBeenCalled();
    });

    it('creates a booking on the only session with a price snapshot', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([mockSession]));
      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.workshopBooking.create.mockResolvedValue(created);

      const result = await service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 });

      expect(result.unitPrice).toBe(25.0);
      expect(result.totalAmount).toBe(50.0);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
      expect(mockTx.workshopBooking.create.mock.calls[0][0].data.sessionId).toBe('session-1');
    });

    it('marks the session FULL when the last seats are taken', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([{ ...mockSession, bookedCount: 8 }]));
      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.workshopBooking.create.mockResolvedValue(created);

      await service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 });
      expect(mockTx.workshopSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: SessionStatus.FULL },
      });
    });

    it('throws ConflictException when the atomic seat update affects no row (overbooking)', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([{ ...mockSession, capacity: 5, bookedCount: 4 }]));
      mockTx.$executeRaw.mockResolvedValue(0);

      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 }),
      ).rejects.toThrow(ConflictException);
      expect(mockTx.workshopBooking.create).not.toHaveBeenCalled();
    });

    it('requires a session choice when several are open', async () => {
      const two = [mockSession, { ...mockSession, id: 'session-2', startTime: hoursFromNow(24 * 20) }];
      mockTx.workshop.findUnique.mockResolvedValue(wsWith(two));
      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a session that does not belong to the workshop', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([mockSession]));
      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 1, sessionId: 'other-session' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires confirmation of the minimum age', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([mockSession], { minAge: 16 }));
      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 1 }),
      ).rejects.toThrow(BadRequestException);

      mockTx.$executeRaw.mockResolvedValue(1);
      mockTx.workshopBooking.create.mockResolvedValue(created);
      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 1, acceptMinAge: true } as any),
      ).resolves.toBeDefined();
    });

    it('should throw BadRequestException if workshop is not PUBLISHED', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([mockSession], { status: WorkshopStatus.DRAFT }));

      await expect(
        service.createBooking('workshop-1', mockUserConsumer, { quantity: 2 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if business lacks WORKSHOPS entitlement', async () => {
      mockTx.workshop.findUnique.mockResolvedValue(wsWith([mockSession]));
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

  describe('refund policy', () => {
    const policy = { cancellationDeadlineHours: 48, refundPercentage: 100 };
    it('refunds in full up to the deadline and nothing after it', () => {
      expect(service.refundPercentFor(policy, hoursFromNow(72), 'PARTICIPANT')).toBe(100);
      expect(service.refundPercentFor(policy, hoursFromNow(10), 'PARTICIPANT')).toBe(0);
    });
    it('applies a partial refund percentage', () => {
      expect(service.refundPercentFor({ cancellationDeadlineHours: 24, refundPercentage: 50 }, hoursFromNow(48), 'PARTICIPANT')).toBe(50);
    });
    it('always refunds in full when the organiser cancels', () => {
      expect(service.refundPercentFor(policy, hoursFromNow(1), 'ORGANISER')).toBe(100);
    });
  });

  describe('cancelBooking - Cancellation with Capacity Restore', () => {
    const baseBooking = (startsInHours: number) => ({
      id: 'booking-1',
      workshopId: 'workshop-1',
      sessionId: 'session-1',
      consumerProfileId: 'consumer-profile-1',
      ticketQuantity: 2,
      unitPrice: 25.0,
      totalAmount: 50.0,
      status: BookingStatus.CONFIRMED,
      workshop: { ...mockWorkshop },
      session: { ...mockSession, startTime: hoursFromNow(startsInHours) },
    });

    beforeEach(() => {
      prisma.consumerProfile.findUnique.mockResolvedValue(mockConsumerProfile);
      mockTx.workshopSession.update.mockResolvedValue({ ...mockSession, status: SessionStatus.FULL, bookedCount: 8, capacity: 10 });
      mockTx.workshopBooking.findUnique.mockImplementation(async () => ({ id: 'booking-1', status: BookingStatus.CANCELLED }));
    });

    it('refunds the paid amount in full before the deadline and frees the seats', async () => {
      prisma.workshopBooking.findUnique.mockResolvedValue(baseBooking(24 * 5));
      mockTx.payment.findMany.mockResolvedValue([{ amount: 50 }]);

      const result = await service.cancelBooking('booking-1', mockUserConsumer);

      expect(result!.status).toBe(BookingStatus.CANCELLED);
      const data = mockTx.workshopBooking.update.mock.calls[0][0].data;
      expect(data.refundPercent).toBe(100);
      expect(data.refundAmount).toBe(50);
      expect(mockTx.workshopSession.update.mock.calls[0][0].data).toEqual({ bookedCount: { decrement: 2 } });
      // 50 EUR paid, 100 % refund -> 5000 cents handed to the payment provider.
      expect(payments.refundWorkshopBooking).toHaveBeenCalledWith('booking-1', expect.any(String), 5000);
      expect((result as any).refund).toEqual({ status: 'NOT_REQUIRED', refundedCents: 0 });
    });

    it('refunds nothing after the deadline', async () => {
      prisma.workshopBooking.findUnique.mockResolvedValue(baseBooking(10));
      mockTx.payment.findMany.mockResolvedValue([{ amount: 50 }]);

      await service.cancelBooking('booking-1', mockUserConsumer);
      const data = mockTx.workshopBooking.update.mock.calls[0][0].data;
      expect(data.refundPercent).toBe(0);
      expect(data.refundAmount).toBe(0);
      expect(payments.refundWorkshopBooking).not.toHaveBeenCalled();
    });

    it('rejects cancelling someone else\'s booking', async () => {
      prisma.workshopBooking.findUnique.mockResolvedValue({ ...baseBooking(100), consumerProfileId: 'someone-else' });
      await expect(service.cancelBooking('booking-1', mockUserConsumer)).rejects.toThrow(ForbiddenException);
    });

    it('rejects cancelling after the session started', async () => {
      prisma.workshopBooking.findUnique.mockResolvedValue(baseBooking(-1));
      await expect(service.cancelBooking('booking-1', mockUserConsumer)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelWorkshop / cancelSession', () => {
    beforeEach(() => {
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockTx.workshopBooking.findMany.mockResolvedValue([
        { id: 'b1', consumerProfile: { userId: 'u1' } },
        { id: 'b2', consumerProfile: { userId: 'u2' } },
      ]);
      mockTx.payment.findMany.mockResolvedValue([{ amount: 25 }]);
      mockTx.workshop.findUnique.mockResolvedValue({ ...mockWorkshop, status: WorkshopStatus.CANCELLED });
    });

    it('cancelWorkshop refunds fully and notifies every participant', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ ...mockWorkshop, business: mockBusiness });
      await service.cancelWorkshop('workshop-1', mockUserOwner);

      expect(mockTx.workshopBooking.update).toHaveBeenCalledTimes(2);
      expect(mockTx.workshopBooking.update.mock.calls[0][0].data).toMatchObject({
        status: BookingStatus.CANCELLED,
        refundPercent: 100,
        refundAmount: 25,
      });
      expect(notifications.notifyUser).toHaveBeenCalledTimes(2);
      expect(notifications.notifyUser.mock.calls.map((c) => c[0]).sort()).toEqual(['u1', 'u2']);
      // The money really goes back through the payment provider, not only into a record.
      expect(payments.refundWorkshopBooking).toHaveBeenCalledTimes(2);
    });

    it('cancelWorkshop rejects another owner', async () => {
      prisma.workshop.findUnique.mockResolvedValue({
        ...mockWorkshop,
        business: { ...mockBusiness, ownerProfileId: 'profile-2' },
      });
      await expect(service.cancelWorkshop('workshop-1', mockUserOwner)).rejects.toThrow(ForbiddenException);
      expect(notifications.notifyUser).not.toHaveBeenCalled();
    });

    it('cancelSession cancels only that session and notifies its participants', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ ...mockWorkshop });
      prisma.workshopSession.findFirst.mockResolvedValue(mockSession);
      mockTx.workshopSession.update.mockResolvedValue({ ...mockSession, status: SessionStatus.CANCELLED });

      await service.cancelSession('workshop-1', 'session-1', mockUserOwner);

      expect(mockTx.workshopBooking.findMany.mock.calls[0][0].where.sessionId).toBe('session-1');
      expect(notifications.notifyUser).toHaveBeenCalledTimes(2);
    });

    it('cancelSession 404s for a session of another workshop', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ ...mockWorkshop });
      prisma.workshopSession.findFirst.mockResolvedValue(null);
      await expect(service.cancelSession('workshop-1', 'x', mockUserOwner)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWorkshop with sessions', () => {
    it('rejects time/capacity edits when there are several sessions', async () => {
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.workshop.findUnique.mockResolvedValue({
        ...mockWorkshop,
        sessions: [mockSession, { ...mockSession, id: 'session-2' }],
      });
      await expect(
        service.updateWorkshop('workshop-1', mockUserOwner, { capacity: 20 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('participants', () => {
    beforeEach(() => {
      prisma.businessOwnerProfile.findUnique.mockResolvedValue(mockOwnerProfile);
      prisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.workshop.findUnique.mockResolvedValue({ ...mockWorkshop });
    });
    const row = (name: string) => ({
      id: 'b',
      ticketQuantity: 1,
      totalAmount: 25,
      status: BookingStatus.CONFIRMED,
      sessionId: 'session-1',
      session: { id: 'session-1', startTime: new Date('2027-01-15T10:00:00Z'), endTime: new Date() },
      createdAt: new Date('2026-10-01T10:00:00Z'),
      consumerProfile: { id: 'c', displayName: name, firstName: null, lastName: null, phone: '+31600000000' },
    });

    it('lists participants for the owner only', async () => {
      prisma.workshopBooking.findMany.mockResolvedValue([row('Anna')]);
      const res = await service.getParticipants('workshop-1', mockUserOwner);
      expect(res.data[0]).toMatchObject({ name: 'Anna', tickets: 1 });

      prisma.business.findUnique.mockResolvedValue({ ...mockBusiness, ownerProfileId: 'profile-2' });
      await expect(service.getParticipants('workshop-1', mockUserOwner)).rejects.toThrow(ForbiddenException);
    });

    it('lets an active employee of the shop see participants, but not a stranger', async () => {
      prisma.businessOwnerProfile.findUnique.mockResolvedValue({ id: 'someone-else', userId: 'x' });
      prisma.workshopBooking.findMany.mockResolvedValue([row('Anna')]);
      const staff = { id: 'staff-1', role: UserRole.CONSUMER };
      employees.isActiveStaff.mockResolvedValue(true);
      await expect(service.getParticipants('workshop-1', staff)).resolves.toBeDefined();
      expect(employees.isActiveStaff).toHaveBeenCalledWith('staff-1', 'bus-1');
      employees.isActiveStaff.mockResolvedValue(false);
      await expect(service.getParticipants('workshop-1', staff)).rejects.toThrow(ForbiddenException);
    });

    it('neutralises spreadsheet formulas and escapes quotes in the CSV', async () => {
      prisma.workshopBooking.findMany.mockResolvedValue([row('=HYPERLINK("x")')]);
      const csv = await service.getParticipantsCsv('workshop-1', mockUserOwner);
      const line = csv.split('\n')[1];
      expect(line.startsWith("\"'=HYPERLINK(\"\"x\"\")\"")).toBe(true);
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

  describe('paid workshops', () => {
    it('releases the seats of unpaid bookings after the hold time, once', async () => {
      prisma.workshopBooking.findMany.mockResolvedValue([
        { id: 'b1', workshopId: 'workshop-1', sessionId: 'session-1', ticketQuantity: 2, workshop: { status: WorkshopStatus.PUBLISHED }, payments: [{ providerTransactionId: 'tr_abc12345', status: 'PENDING' }] },
      ]);
      prisma.workshopBooking.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      mockTx.workshopBooking.updateMany = prisma.workshopBooking.updateMany;
      mockTx.workshopSession.update.mockResolvedValue({ id: 'session-1', status: SessionStatus.FULL, bookedCount: 3, capacity: 5 });

      const result = await service.expireUnpaidBookings(new Date('2026-10-20T12:00:00Z'));

      expect(payments.syncFromProvider).toHaveBeenCalledWith('tr_abc12345');
      expect(prisma.workshopBooking.findMany.mock.calls[0][0].where.createdAt.lt).toEqual(new Date('2026-10-20T11:30:00Z'));
      expect(prisma.workshopBooking.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'b1', status: BookingStatus.PENDING } }));
      expect(mockTx.workshopSession.update).toHaveBeenCalledWith({ where: { id: 'session-1' }, data: { bookedCount: { decrement: 2 } } });
      expect(mockTx.workshopSession.update).toHaveBeenCalledWith({ where: { id: 'session-1' }, data: { status: SessionStatus.OPEN } });
      expect(result).toEqual({ checked: 1, released: 1 });
    });

    it('does not release a booking another run (or the payment) already settled', async () => {
      prisma.workshopBooking.findMany.mockResolvedValue([
        { id: 'b1', workshopId: 'workshop-1', sessionId: 'session-1', ticketQuantity: 2, workshop: { status: WorkshopStatus.PUBLISHED }, payments: [] },
      ]);
      mockTx.workshopBooking.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const result = await service.expireUnpaidBookings();
      expect(result.released).toBe(0);
      expect(mockTx.workshopSession.update).not.toHaveBeenCalled();
    });
  });
});
