import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BookingStatus, PaymentProvider, PaymentPurpose, PaymentStatus, UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY } from './payment-gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { AuthUser } from '../common/types/auth-user';

/**
 * Fixtures follow the real data model: JWT users have an `id` (User.id) AND a
 * `profileId` (ConsumerProfile.id / BusinessOwnerProfile.id). Ownership is
 * always checked against the profile id — never the user id.
 */
const consumerA: AuthUser = { id: 'user-ca', role: UserRole.CONSUMER, profileId: 'cp-a' };
const consumerB: AuthUser = { id: 'user-cb', role: UserRole.CONSUMER, profileId: 'cp-b' };
const ownerA: AuthUser = { id: 'user-oa', role: UserRole.BUSINESS_OWNER, profileId: 'op-1' };
const ownerB: AuthUser = { id: 'user-ob', role: UserRole.BUSINESS_OWNER, profileId: 'op-2' };
const admin: AuthUser = { id: 'user-admin', role: UserRole.SUPER_ADMIN };

const businessA = { id: 'biz-1', ownerProfileId: 'op-1' };
const businessB = { id: 'biz-2', ownerProfileId: 'op-2' };

const orderA = { id: 'order-1', consumerProfileId: 'cp-a', businessId: 'biz-1', status: 'PENDING', totalAmount: 100 };
const bookingA = {
  id: 'booking-1',
  consumerProfileId: 'cp-a',
  ticketQuantity: 2,
  unitPrice: 65,
  totalAmount: 130,
  status: BookingStatus.PENDING,
  workshop: { businessId: 'biz-1' },
};
const subscriptionA = {
  id: 'sub-1',
  businessId: 'biz-1',
  plan: { monthlyPrice: 50 },
  business: { id: 'biz-1', ownerProfileId: 'op-1' },
};

const basePayment = {
  id: 'pay-1',
  purpose: PaymentPurpose.PRODUCT_ORDER,
  provider: PaymentProvider.STRIPE,
  status: PaymentStatus.PAID,
  amount: 100,
  currency: 'EUR',
  providerTransactionId: 'cs_test_123',
  businessId: 'biz-1',
  userId: 'user-ca',
  orderId: 'order-1',
  workshopBookingId: null,
  businessSubscriptionId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  order: { consumerProfileId: 'cp-a', businessId: 'biz-1' },
  workshopBooking: null,
  businessSubscription: null,
};
const subscriptionPayment = {
  ...basePayment,
  id: 'pay-sub',
  purpose: PaymentPurpose.BUSINESS_SUBSCRIPTION,
  amount: 50,
  orderId: null,
  businessSubscriptionId: 'sub-1',
  order: null,
  businessSubscription: { businessId: 'biz-1' },
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  const gateway = { isConfigured: jest.fn(), refund: jest.fn(), createPayment: jest.fn(), getPayment: jest.fn() };
  const notifications = { notifyUser: jest.fn(), notifyBusinessOwner: jest.fn() };
  const configValues: Record<string, string> = { FRONTEND_URL: 'https://app.example.nl', API_PUBLIC_URL: 'https://api.example.nl' };

  beforeEach(async () => {
    jest.resetAllMocks();
    gateway.isConfigured.mockReturnValue(true);
    gateway.refund.mockResolvedValue({ providerRefundId: 're_1' });
    gateway.createPayment.mockResolvedValue({ providerPaymentId: 'cs_test_new', checkoutUrl: 'https://pay.stripe.test/checkout/cs_test_new' });
    notifications.notifyUser.mockResolvedValue(undefined);
    notifications.notifyBusinessOwner.mockResolvedValue(undefined);

    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      customerOrder: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), updateMany: jest.fn() },
      orderStatusEvent: { create: jest.fn() },
      merchantEmployee: { findMany: jest.fn().mockResolvedValue([]) },
      paymentWebhookEvent: { create: jest.fn().mockResolvedValue({}), updateMany: jest.fn().mockResolvedValue({}) },
      workshopBooking: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      businessSubscription: { findUnique: jest.fn(), update: jest.fn() },
      business: { findUnique: jest.fn() },
      payment: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      businessLedgerEntry: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      auditLog: { findFirst: jest.fn(), create: jest.fn() },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    prisma.$transaction = jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma));
    prisma.business.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      [businessA, businessB].find((b) => b.id === where.id) ?? null,
    );
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'pay-new',
      createdAt: new Date(),
      ...data,
    }));
    prisma.businessLedgerEntry.findMany.mockResolvedValue([]);
    prisma.businessLedgerEntry.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'led-1', ...data }));
    prisma.payment.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...basePayment, ...data }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PAYMENT_GATEWAY, useValue: gateway },
        { provide: NotificationsService, useValue: notifications },
        { provide: ConfigService, useValue: { get: (k: string) => configValues[k] } },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  const intent = (purpose: PaymentPurpose, relatedEntityId: string): CreatePaymentIntentDto => ({
    purpose,
    relatedEntityId,
    provider: PaymentProvider.STRIPE,
  });

  // ------------------------------------------------------------------
  describe('createPaymentIntent', () => {
    it('derives the order amount from the server and ignores any client amount', async () => {
      prisma.order.findUnique.mockResolvedValue(orderA);
      const tampered = { ...intent(PaymentPurpose.PRODUCT_ORDER, 'order-1'), amount: 0.01 } as CreatePaymentIntentDto;

      const result = await service.createPaymentIntent(consumerA, tampered);

      expect(result.amount).toBe(100);
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ amount: 100, currency: 'EUR', orderId: 'order-1', businessId: 'biz-1', userId: 'user-ca', status: PaymentStatus.PENDING }),
      });
    });

    it('uses the booking total (quantity-aware), not the unit price', async () => {
      prisma.workshopBooking.findUnique.mockResolvedValue(bookingA);
      const result = await service.createPaymentIntent(consumerA, intent(PaymentPurpose.WORKSHOP_BOOKING, 'booking-1'));
      expect(result.amount).toBe(130);
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ workshopBookingId: 'booking-1', businessId: 'biz-1' }),
      });
    });

    it('uses the plan price for a subscription payment by the owning business owner', async () => {
      prisma.businessSubscription.findUnique.mockResolvedValue(subscriptionA);
      const result = await service.createPaymentIntent(ownerA, intent(PaymentPurpose.BUSINESS_SUBSCRIPTION, 'sub-1'));
      expect(result.amount).toBe(50);
    });

    it('lets an owner pay for a different plan although an earlier plan of the same subscription row was paid', async () => {
      prisma.businessSubscription.findUnique.mockResolvedValue({ ...subscriptionA, status: 'INCOMPLETE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 86_400_000) });
      prisma.payment.findMany.mockResolvedValue([{ ...subscriptionPayment, status: PaymentStatus.PAID, createdAt: new Date('2026-01-01') }]);
      const result = await service.createPaymentIntent(ownerA, intent(PaymentPurpose.BUSINESS_SUBSCRIPTION, 'sub-1'));
      expect(result.amount).toBe(50);
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    it('still refuses to charge a subscription that is active and not yet expired', async () => {
      prisma.businessSubscription.findUnique.mockResolvedValue({ ...subscriptionA, status: 'ACTIVE', currentPeriodStart: new Date('2026-01-01'), currentPeriodEnd: new Date(Date.now() + 86_400_000) });
      prisma.payment.findMany.mockResolvedValue([]);
      await expect(service.createPaymentIntent(ownerA, intent(PaymentPurpose.BUSINESS_SUBSCRIPTION, 'sub-1'))).rejects.toThrow('already been paid');
    });

    it.each([
      ['another consumer', consumerB, PaymentPurpose.PRODUCT_ORDER, 'order-1'],
      ['a business owner for an order', ownerA, PaymentPurpose.PRODUCT_ORDER, 'order-1'],
      ['an admin for an order', admin, PaymentPurpose.PRODUCT_ORDER, 'order-1'],
      ['another consumer for a booking', consumerB, PaymentPurpose.WORKSHOP_BOOKING, 'booking-1'],
      ['another business owner for a subscription', ownerB, PaymentPurpose.BUSINESS_SUBSCRIPTION, 'sub-1'],
      ['a consumer for a subscription', consumerA, PaymentPurpose.BUSINESS_SUBSCRIPTION, 'sub-1'],
    ])('forbids %s', async (_label, actor, purpose, id) => {
      prisma.order.findUnique.mockResolvedValue(orderA);
      prisma.workshopBooking.findUnique.mockResolvedValue(bookingA);
      prisma.businessSubscription.findUnique.mockResolvedValue(subscriptionA);
      await expect(service.createPaymentIntent(actor, intent(purpose, id))).rejects.toThrow(ForbiddenException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it.each([
      [PaymentPurpose.PRODUCT_ORDER],
      [PaymentPurpose.WORKSHOP_BOOKING],
      [PaymentPurpose.BUSINESS_SUBSCRIPTION],
    ])('returns 404 for a missing %s resource', async (purpose) => {
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.workshopBooking.findUnique.mockResolvedValue(null);
      prisma.businessSubscription.findUnique.mockResolvedValue(null);
      await expect(service.createPaymentIntent(consumerA, intent(purpose, 'missing'))).rejects.toThrow(NotFoundException);
    });

    it('rejects an unknown purpose', async () => {
      await expect(
        service.createPaymentIntent(consumerA, { purpose: 'GIFT_CARD' as PaymentPurpose, relatedEntityId: 'x', provider: PaymentProvider.STRIPE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects cancelled orders and cancelled bookings', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderA, status: 'CANCELLED' });
      await expect(service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'order-1'))).rejects.toThrow(ConflictException);
      prisma.workshopBooking.findUnique.mockResolvedValue({ ...bookingA, status: BookingStatus.CANCELLED });
      await expect(service.createPaymentIntent(consumerA, intent(PaymentPurpose.WORKSHOP_BOOKING, 'booking-1'))).rejects.toThrow(ConflictException);
    });

    it('rejects a zero payable amount derived from server data', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderA, totalAmount: 0 });
      await expect(service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'order-1'))).rejects.toThrow(BadRequestException);
    });

    it('is idempotent: returns the open payment instead of creating a duplicate', async () => {
      prisma.order.findUnique.mockResolvedValue(orderA);
      prisma.payment.findMany.mockResolvedValue([{ ...basePayment, id: 'pay-open', status: PaymentStatus.PENDING, checkoutUrl: 'https://pay.stripe.test/x' }]);
      const result = await service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'order-1'));
      expect(result.paymentId).toBe('pay-open');
      expect(result.checkoutUrl).toBe('https://pay.stripe.test/x');
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(gateway.createPayment).not.toHaveBeenCalled();
    });

    it('rejects paying an already-paid order', async () => {
      prisma.order.findUnique.mockResolvedValue(orderA);
      prisma.payment.findMany.mockResolvedValue([{ ...basePayment, status: PaymentStatus.PAID }]);
      await expect(service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'order-1'))).rejects.toThrow(ConflictException);
    });
  });

  // ------------------------------------------------------------------
  describe('getPayment', () => {
    beforeEach(() => prisma.payment.findUnique.mockResolvedValue(basePayment));

    it('lets the paying consumer, the owning business owner and a super admin read it', async () => {
      await expect(service.getPayment('pay-1', consumerA)).resolves.toMatchObject({ id: 'pay-1' });
      await expect(service.getPayment('pay-1', ownerA)).resolves.toMatchObject({ id: 'pay-1' });
      await expect(service.getPayment('pay-1', admin)).resolves.toMatchObject({ id: 'pay-1' });
    });

    it('does not leak relation internals in the response', async () => {
      const result = await service.getPayment('pay-1', admin);
      expect(result).not.toHaveProperty('order');
    });

    it('forbids another consumer and another business owner', async () => {
      await expect(service.getPayment('pay-1', consumerB)).rejects.toThrow(ForbiddenException);
      await expect(service.getPayment('pay-1', ownerB)).rejects.toThrow(ForbiddenException);
    });

    it('forbids a consumer from reading a subscription payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(subscriptionPayment);
      await expect(service.getPayment('pay-sub', consumerA)).rejects.toThrow(ForbiddenException);
      await expect(service.getPayment('pay-sub', ownerA)).resolves.toBeDefined();
    });

    it('returns 404 for an unknown payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getPayment('nope', admin)).rejects.toThrow(NotFoundException);
    });
  });

  // ------------------------------------------------------------------
  describe('getBusinessPayments', () => {
    beforeEach(() => prisma.payment.findMany.mockResolvedValue([basePayment, subscriptionPayment]));

    it('groups payments by purpose for the owner and the super admin', async () => {
      const result = await service.getBusinessPayments('biz-1', ownerA);
      expect(result.orderPayments).toHaveLength(1);
      expect(result.subscriptionPayments).toHaveLength(1);
      expect(result.workshopBookingPayments).toHaveLength(0);
      await expect(service.getBusinessPayments('biz-1', admin)).resolves.toBeDefined();
    });

    it('forbids other owners and consumers; 404 for unknown business', async () => {
      await expect(service.getBusinessPayments('biz-1', ownerB)).rejects.toThrow(ForbiddenException);
      await expect(service.getBusinessPayments('biz-1', consumerA)).rejects.toThrow(ForbiddenException);
      await expect(service.getBusinessPayments('missing', admin)).rejects.toThrow(NotFoundException);
    });
  });

  // ------------------------------------------------------------------
  describe('updatePaymentStatus (provider webhook handler)', () => {
    it('marks PAID, syncs the order and writes the sale ledger entry once', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: PaymentStatus.PENDING });
      prisma.businessLedgerEntry.findFirst.mockResolvedValue(null);

      await service.updatePaymentStatus('pay-1', PaymentStatus.PAID, 'cs_test_123');

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.PAID, paidAt: expect.any(Date) }) }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { paymentStatus: PaymentStatus.PAID } });
      expect(prisma.businessLedgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'SALE', amountCents: 10000, businessId: 'biz-1' }),
      });
    });

    it('is a no-op when the provider re-delivers the same status', async () => {
      prisma.payment.findUnique.mockResolvedValue(basePayment);
      await service.updatePaymentStatus('pay-1', PaymentStatus.PAID, 'cs_test_123');
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('rejects invalid transitions and unknown payments', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: PaymentStatus.REFUNDED });
      await expect(service.updatePaymentStatus('pay-1', PaymentStatus.PAID, 'tr')).rejects.toThrow(ConflictException);
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.updatePaymentStatus('x', PaymentStatus.PAID, 'tr')).rejects.toThrow(NotFoundException);
    });
  });

  // ------------------------------------------------------------------
  describe('processRefund', () => {
    beforeEach(() => prisma.payment.findUnique.mockResolvedValue(basePayment));

    it('refuses (503) and reserves nothing when no payment provider is configured', async () => {
      gateway.isConfigured.mockReturnValue(false);
      await expect(service.processRefund('pay-1', ownerA, { amount: 10 })).rejects.toThrow(ServiceUnavailableException);
      expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it.each([[0], [-5], [Number.NaN], [Infinity], [10.005]])('rejects invalid amount %p', async (amount) => {
      await expect(service.processRefund('pay-1', ownerA, { amount })).rejects.toThrow(BadRequestException);
      expect(gateway.refund).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.processRefund('nope', admin, { amount: 5 })).rejects.toThrow(NotFoundException);
    });

    it('rejects refunds of unpaid payments', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: PaymentStatus.PENDING });
      await expect(service.processRefund('pay-1', admin, { amount: 5 })).rejects.toThrow(BadRequestException);
    });

    it.each([
      ['a consumer', consumerA],
      ['another business owner', ownerB],
    ])('forbids %s', async (_l, actor) => {
      await expect(service.processRefund('pay-1', actor, { amount: 5 })).rejects.toThrow(ForbiddenException);
      expect(gateway.refund).not.toHaveBeenCalled();
    });

    it('forbids a business owner from refunding their own subscription fee, but allows a super admin', async () => {
      prisma.payment.findUnique.mockResolvedValue(subscriptionPayment);
      await expect(service.processRefund('pay-sub', ownerA, { amount: 5 })).rejects.toThrow(ForbiddenException);
      await expect(service.processRefund('pay-sub', admin, { amount: 5 })).resolves.toMatchObject({ status: PaymentStatus.PARTIALLY_REFUNDED });
    });

    it('locks the payment row inside the transaction', async () => {
      await service.processRefund('pay-1', ownerA, { amount: 10 });
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('records a partial refund only after the provider confirms, with ledger + audit trail', async () => {
      prisma.businessLedgerEntry.findMany
        .mockResolvedValueOnce([]) // existing refunds when reserving
        .mockResolvedValueOnce([{ amountCents: -2500 }]); // confirmed after provider success

      const result = await service.processRefund('pay-1', ownerA, { amount: 25, reason: 'damaged' });

      expect(gateway.refund).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 2500, currency: 'EUR', providerTransactionId: 'cs_test_123' }));
      expect(result).toMatchObject({ status: PaymentStatus.PARTIALLY_REFUNDED, refundedAmount: 25, replayed: false });
      expect(prisma.businessLedgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'REFUND_PENDING', amountCents: -2500 }),
      });
      expect(prisma.businessLedgerEntry.update).toHaveBeenCalledWith({ where: { id: 'led-1' }, data: { type: 'REFUND' } });
      const actions = prisma.auditLog.create.mock.calls.map((c: [{ data: { action: string } }]) => c[0].data.action);
      expect(actions).toEqual(['PAYMENT_REFUND_REQUESTED', 'PAYMENT_REFUNDED']);
    });

    it('sets REFUNDED and syncs the order when the cumulative refund covers the payment', async () => {
      prisma.businessLedgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ amountCents: -10000 }]);
      const result = await service.processRefund('pay-1', admin, { amount: 100 });
      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { paymentStatus: PaymentStatus.REFUNDED } });
    });

    it('prevents cumulative over-refunding, including in-flight refunds', async () => {
      prisma.businessLedgerEntry.findMany.mockResolvedValue([{ amountCents: -6000 }, { amountCents: -3000 }]);
      await expect(service.processRefund('pay-1', ownerA, { amount: 20 })).rejects.toThrow(/refundable balance \(10\.00 EUR\)/);
      expect(gateway.refund).not.toHaveBeenCalled();
      await expect(service.processRefund('pay-1', ownerA, { amount: 10 })).resolves.toBeDefined();
    });

    it('allows a further refund on a PARTIALLY_REFUNDED payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: PaymentStatus.PARTIALLY_REFUNDED });
      prisma.businessLedgerEntry.findMany.mockResolvedValueOnce([{ amountCents: -4000 }]).mockResolvedValueOnce([{ amountCents: -4000 }, { amountCents: -1000 }]);
      const result = await service.processRefund('pay-1', ownerA, { amount: 10 });
      expect(result.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });

    it('does not report success when the provider fails: releases the reservation and returns 502', async () => {
      gateway.refund.mockRejectedValue(new Error('PSP timeout'));
      await expect(service.processRefund('pay-1', ownerA, { amount: 10 })).rejects.toThrow(BadGatewayException);
      expect(prisma.businessLedgerEntry.update).toHaveBeenCalledWith({ where: { id: 'led-1' }, data: { type: 'REFUND_FAILED' } });
      expect(prisma.payment.update).not.toHaveBeenCalled();
      const actions = prisma.auditLog.create.mock.calls.map((c: [{ data: { action: string } }]) => c[0].data.action);
      expect(actions).toContain('PAYMENT_REFUND_FAILED');
      expect(actions).not.toContain('PAYMENT_REFUNDED');
    });

    describe('idempotency key', () => {
      it('replays a confirmed refund without calling the provider again', async () => {
        prisma.auditLog.findFirst.mockResolvedValue({ metadata: { ledgerEntryId: 'led-0', amountCents: 1000 } });
        prisma.businessLedgerEntry.findUnique.mockResolvedValue({ id: 'led-0', type: 'REFUND', amountCents: -1000 });
        const result = await service.processRefund('pay-1', ownerA, { amount: 10, idempotencyKey: 'k1' });
        expect(result).toMatchObject({ replayed: true, refundedAmount: 10 });
        expect(gateway.refund).not.toHaveBeenCalled();
        expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
      });

      it('conflicts while the first attempt is still in progress or when the amount differs', async () => {
        prisma.auditLog.findFirst.mockResolvedValue({ metadata: { ledgerEntryId: 'led-0', amountCents: 1000 } });
        prisma.businessLedgerEntry.findUnique.mockResolvedValue({ id: 'led-0', type: 'REFUND_PENDING', amountCents: -1000 });
        await expect(service.processRefund('pay-1', ownerA, { amount: 10, idempotencyKey: 'k1' })).rejects.toThrow(ConflictException);
        await expect(service.processRefund('pay-1', ownerA, { amount: 20, idempotencyKey: 'k1' })).rejects.toThrow(/different amount/);
      });
    });
  });

  // ------------------------------------------------------------------
  describe('hosted checkout (Stripe iDEAL)', () => {
    const checkout = {
      id: 'co-1',
      orderNumber: 'LS-ABC',
      consumerProfileId: 'cp-a',
      cancelledAt: null,
      orders: [
        { id: 'order-1', businessId: 'biz-1', totalAmount: 60, status: 'PENDING' },
        { id: 'order-2', businessId: 'biz-2', totalAmount: 40.5, status: 'PENDING' },
      ],
    };

    it('refuses to start a payment when no provider is configured', async () => {
      gateway.isConfigured.mockReturnValue(false);
      const err = await service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'order-1')).catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect((err as ServiceUnavailableException).getResponse()).toMatchObject({ code: 'PAYMENTS_UNAVAILABLE' });
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('rejects providers other than Stripe', async () => {
      await expect(
        service.createPaymentIntent(consumerA, { purpose: PaymentPurpose.PRODUCT_ORDER, relatedEntityId: 'order-1', provider: PaymentProvider.PAYPAL }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates ONE provider payment for a multi-store checkout and one Payment row per store', async () => {
      prisma.customerOrder.findUnique.mockResolvedValue(checkout);
      let n = 0;
      prisma.payment.create.mockImplementation(async ({ data }: any) => ({ id: `pay-${++n}`, createdAt: new Date(), ...data }));

      const result = await service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'co-1'));

      expect(gateway.createPayment).toHaveBeenCalledTimes(1);
      expect(gateway.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 10050,
          currency: 'EUR',
          redirectUrl: 'https://app.example.nl/payment/return?payment=pay-1',
          method: 'IDEAL',
          idempotencyKey: 'intent-pay-1',
          metadata: expect.objectContaining({ paymentId: 'pay-1', scopeId: 'co-1' }),
        }),
      );
      expect(prisma.payment.create).toHaveBeenCalledTimes(2);
      expect(prisma.payment.create.mock.calls[0][0].data).toMatchObject({ orderId: 'order-1', customerOrderId: 'co-1', businessId: 'biz-1', amount: 60 });
      expect(prisma.payment.create.mock.calls[1][0].data).toMatchObject({ orderId: 'order-2', customerOrderId: 'co-1', businessId: 'biz-2', amount: 40.5 });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['pay-1', 'pay-2'] } },
        data: { providerTransactionId: 'cs_test_new', checkoutUrl: 'https://pay.stripe.test/checkout/cs_test_new' },
      });
      expect(result).toMatchObject({ paymentId: 'pay-1', amount: 100.5, checkoutUrl: 'https://pay.stripe.test/checkout/cs_test_new' });
      expect(prisma.$executeRaw).toHaveBeenCalled(); // advisory lock
    });

    it('only asks to pay for the stores whose order is still active', async () => {
      prisma.customerOrder.findUnique.mockResolvedValue({ ...checkout, orders: [{ ...checkout.orders[0], status: 'CANCELLED' }, checkout.orders[1]] });
      await service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'co-1'));
      expect(gateway.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 4050 }));
    });

    it("forbids paying someone else's checkout", async () => {
      prisma.customerOrder.findUnique.mockResolvedValue(checkout);
      await expect(service.createPaymentIntent(consumerB, intent(PaymentPurpose.PRODUCT_ORDER, 'co-1'))).rejects.toThrow(ForbiddenException);
    });

    it('marks the new payments FAILED and answers 502 when the provider cannot start the payment', async () => {
      prisma.customerOrder.findUnique.mockResolvedValue(checkout);
      gateway.createPayment.mockRejectedValue(new Error('boom'));
      await expect(service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'co-1'))).rejects.toThrow(BadGatewayException);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: PaymentStatus.FAILED } }),
      );
    });
  });

  // ------------------------------------------------------------------
  describe('Stripe webhook / provider sync', () => {
    const rows = [
      { ...basePayment, id: 'pay-1', status: PaymentStatus.PENDING, amount: 60, providerTransactionId: 'cs_test_abc12345', orderId: 'order-1' },
      { ...basePayment, id: 'pay-2', status: PaymentStatus.PENDING, amount: 40.5, providerTransactionId: 'cs_test_abc12345', orderId: 'order-2', businessId: 'biz-2' },
    ];
    const info = (extra: Record<string, unknown> = {}) => ({
      providerPaymentId: 'cs_test_abc12345',
      status: 'PAID',
      amountCents: 10050,
      currency: 'EUR',
      metadata: { paymentId: 'pay-1' },
      checkoutUrl: null,
      ...extra,
    });

    beforeEach(() => {
      prisma.payment.findMany.mockResolvedValue(rows);
      prisma.payment.findUnique.mockImplementation(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null);
      prisma.businessLedgerEntry.findFirst.mockResolvedValue(null);
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', orderNumber: 'LS-1', status: 'PENDING', businessId: 'biz-1', totalAmount: 60, consumerProfile: { userId: 'user-ca' } });
    });

    it('ignores ids that are not Stripe Checkout Session ids and never calls the provider for them', async () => {
      await service.handleProviderWebhook('../../etc/passwd');
      await service.handleProviderWebhook('');
      expect(gateway.getPayment).not.toHaveBeenCalled();
    });

    it('ignores payments it does not know', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      await service.handleProviderWebhook('cs_test_unknown123');
      expect(gateway.getPayment).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('marks every store payment paid, writes one sale per store and the checkout paid, using the provider status', async () => {
      gateway.getPayment.mockResolvedValue(info());
      await service.handleProviderWebhook('cs_test_abc12345');

      expect(gateway.getPayment).toHaveBeenCalledWith('cs_test_abc12345');
      expect(prisma.payment.update).toHaveBeenCalledTimes(2);
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'order-1' }, data: { paymentStatus: PaymentStatus.PAID } });
      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 'order-2' }, data: { paymentStatus: PaymentStatus.PAID } });
      expect(prisma.businessLedgerEntry.create).toHaveBeenCalledTimes(2);
      expect(prisma.businessLedgerEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ businessId: 'biz-2', type: 'SALE', amountCents: 4050 }) });
      expect(notifications.notifyUser).toHaveBeenCalledWith('user-ca', 'ORDER', 'Betaling ontvangen', expect.any(String), expect.any(Object));
      expect(notifications.notifyBusinessOwner).toHaveBeenCalled();
    });

    it('does nothing when the provider amount does not match our records', async () => {
      gateway.getPayment.mockResolvedValue(info({ amountCents: 1 }));
      await service.handleProviderWebhook('cs_test_abc12345');
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
    });

    it('does nothing when the provider metadata points at a different payment', async () => {
      gateway.getPayment.mockResolvedValue(info({ metadata: { paymentId: 'someone-elses' } }));
      await service.handleProviderWebhook('cs_test_abc12345');
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('is idempotent when the webhook is delivered again for an already-paid payment', async () => {
      const paid = rows.map((r) => ({ ...r, status: PaymentStatus.PAID }));
      prisma.payment.findMany.mockResolvedValue(paid);
      prisma.payment.findUnique.mockImplementation(async ({ where }: any) => paid.find((r) => r.id === where.id) ?? null);
      gateway.getPayment.mockResolvedValue(info());
      await service.handleProviderWebhook('cs_test_abc12345');
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
      expect(notifications.notifyUser).not.toHaveBeenCalled();
    });

    it('records a failed payment without touching the ledger', async () => {
      gateway.getPayment.mockResolvedValue(info({ status: 'FAILED' }));
      await service.handleProviderWebhook('cs_test_abc12345');
      expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: PaymentStatus.FAILED }) }));
      expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
    });

    it('lets the error through when the provider is unreachable so that Stripe retries', async () => {
      gateway.getPayment.mockRejectedValue(new BadGatewayException('down'));
      await expect(service.handleProviderWebhook('cs_test_abc12345')).rejects.toThrow(BadGatewayException);
    });

    it('refunds automatically when the payment arrives after the order was cancelled', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'order-1', orderNumber: 'LS-1', status: 'CANCELLED', businessId: 'biz-1', totalAmount: 60, consumerProfile: { userId: 'user-ca' } });
      gateway.getPayment.mockResolvedValue(info());
      // First read: still pending (status change applies); later reads (refund) see it paid.
      const seen = new Set<string>();
      prisma.payment.findUnique.mockImplementation(async ({ where }: any) => {
        const r = rows.find((x) => x.id === where.id);
        if (!r) return null;
        const again = seen.has(where.id);
        seen.add(where.id);
        return { ...r, status: again ? PaymentStatus.PAID : PaymentStatus.PENDING };
      });
      prisma.businessLedgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValue([{ amountCents: -6000 }]);
      await service.handleProviderWebhook('cs_test_abc12345');
      expect(gateway.refund).toHaveBeenCalledWith(expect.objectContaining({ providerTransactionId: 'cs_test_abc12345', amountCents: 6000 }));
    });
  });

  // ------------------------------------------------------------------
  describe('paid effects', () => {
    it('sets the checkout paid and activates a subscription for 30 days from now', async () => {
      const sub = { id: 'sub-1', status: 'INCOMPLETE', currentPeriodStart: new Date('2026-01-01'), currentPeriodEnd: new Date('2026-01-31') };
      prisma.payment.findUnique.mockResolvedValue({ ...subscriptionPayment, status: PaymentStatus.PENDING });
      prisma.businessSubscription.findUnique.mockResolvedValue(sub);
      const before = Date.now();
      await service.updatePaymentStatus('pay-sub', PaymentStatus.PAID, 'cs_test_sub');
      const data = prisma.businessSubscription.update.mock.calls[0][0].data;
      expect(data.status).toBe('ACTIVE');
      expect(data.provider).toBe('STRIPE');
      expect(data.currentPeriodEnd.getTime()).toBeGreaterThanOrEqual(before + 29.9 * 86400000);
      expect(notifications.notifyUser).not.toHaveBeenCalled(); // owner notification goes through business lookup
    });

    it('extends a running subscription instead of losing paid days', async () => {
      const end = new Date(Date.now() + 10 * 86400000);
      prisma.payment.findUnique.mockResolvedValue({ ...subscriptionPayment, status: PaymentStatus.PENDING });
      prisma.businessSubscription.findUnique.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: end });
      await service.updatePaymentStatus('pay-sub', PaymentStatus.PAID, 'cs_test_sub');
      const data = prisma.businessSubscription.update.mock.calls[0][0].data;
      expect(data.currentPeriodEnd.getTime()).toBe(end.getTime() + 30 * 86400000);
    });

    it('confirms a pending workshop booking when its payment succeeds', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...basePayment, id: 'pay-w', status: PaymentStatus.PENDING, orderId: null, workshopBookingId: 'booking-1', purpose: PaymentPurpose.WORKSHOP_BOOKING });
      prisma.workshopBooking.findUnique.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED', workshop: { id: 'w1', title: 'Keramiek', businessId: 'biz-1' }, consumerProfile: { userId: 'user-ca' } });
      await service.updatePaymentStatus('pay-w', PaymentStatus.PAID, 'cs_test_w');
      expect(prisma.workshopBooking.updateMany).toHaveBeenCalledWith({ where: { id: 'booking-1', status: 'PENDING' }, data: { status: 'CONFIRMED' } });
    });
  });

  // ------------------------------------------------------------------
  describe('expireUnpaidCheckouts', () => {
    const stale = (extra: Record<string, unknown> = {}) => ({
      id: 'co-1',
      payments: [],
      orders: [{ id: 'order-1', items: [{ productId: 'prod-1', productVariantId: null, quantity: 2 }, { productId: 'prod-2', productVariantId: 'var-1', quantity: 1 }] }],
      ...extra,
    });

    it('cancels unpaid orders and gives the stock back', async () => {
      prisma.customerOrder.findMany.mockResolvedValue([stale()]);
      prisma.customerOrder.findUnique.mockResolvedValue({ paymentStatus: PaymentStatus.PENDING });
      prisma.customerOrder.updateMany.mockResolvedValue({ count: 1 });
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.expireUnpaidCheckouts(new Date('2026-10-20T12:00:00Z'));

      expect(result).toEqual({ checked: 1, released: 1 });
      expect(prisma.customerOrder.findMany.mock.calls[0][0].where.createdAt.lt).toEqual(new Date('2026-10-20T11:30:00Z'));
      expect(prisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-1', status: 'PENDING' } }));
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2); // one per item (product + variant)
      expect(prisma.orderStatusEvent.create).toHaveBeenCalled();
    });

    it('asks the provider first and leaves the order alone when it was paid in the meantime', async () => {
      prisma.customerOrder.findMany.mockResolvedValue([stale({ payments: [{ providerTransactionId: 'cs_test_abc12345', status: PaymentStatus.PENDING }] })]);
      prisma.payment.findMany.mockResolvedValue([]); // unknown to sync -> no-op
      prisma.customerOrder.findUnique.mockResolvedValue({ paymentStatus: PaymentStatus.PAID });

      const result = await service.expireUnpaidCheckouts();

      expect(result.released).toBe(0);
      expect(prisma.customerOrder.updateMany).not.toHaveBeenCalled();
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('does not release twice when another run already claimed the checkout', async () => {
      prisma.customerOrder.findMany.mockResolvedValue([stale()]);
      prisma.customerOrder.findUnique.mockResolvedValue({ paymentStatus: PaymentStatus.PENDING });
      prisma.customerOrder.updateMany.mockResolvedValue({ count: 0 });
      const result = await service.expireUnpaidCheckouts();
      expect(result.released).toBe(0);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  describe('automatic refunds for cancelled orders / bookings', () => {
    it('refundOrder refunds the remaining paid amount without an actor', async () => {
      prisma.payment.findFirst.mockResolvedValue(basePayment);
      prisma.payment.findUnique.mockResolvedValue(basePayment);
      prisma.businessLedgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValue([{ amountCents: -10000 }]);
      const result = await service.refundOrder('order-1', 'Bestelling geannuleerd');
      expect(result).toEqual({ status: 'REFUNDED', refundedCents: 10000 });
      expect(gateway.refund).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 10000, providerTransactionId: 'cs_test_123' }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: null, action: 'PAYMENT_REFUND_REQUESTED' }) });
    });

    it('needs no refund for an unpaid order', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);
      await expect(service.refundOrder('order-1', 'x')).resolves.toEqual({ status: 'NOT_REQUIRED', refundedCents: 0 });
      expect(gateway.refund).not.toHaveBeenCalled();
    });

    it('caps a workshop refund at the policy amount', async () => {
      const paid = { ...basePayment, id: 'pay-w', orderId: null, workshopBookingId: 'booking-1', amount: 130 };
      prisma.payment.findFirst.mockResolvedValue(paid);
      prisma.payment.findUnique.mockResolvedValue(paid);
      prisma.businessLedgerEntry.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValue([{ amountCents: -6500 }]);
      const result = await service.refundWorkshopBooking('booking-1', 'Annulering door deelnemer', 6500);
      expect(result.refundedCents).toBe(6500);
      expect(gateway.refund).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 6500 }));
    });

    it('reports FAILED (and audits it) instead of throwing when the provider refuses', async () => {
      prisma.payment.findFirst.mockResolvedValue(basePayment);
      prisma.payment.findUnique.mockResolvedValue(basePayment);
      gateway.refund.mockRejectedValue(new Error('provider down'));
      prisma.auditLog.create.mockResolvedValue({});
      prisma.businessLedgerEntry.update.mockResolvedValue({});
      const result = await service.refundOrder('order-1', 'x');
      expect(result.status).toBe('FAILED');
      expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'PAYMENT_AUTO_REFUND_FAILED' }) });
    });
  });
  // ------------------------------------------------------------------
  describe('commission, payout hold and reversal (ledger)', () => {
    beforeEach(() => {
      prisma.payment.findUnique.mockResolvedValue(basePayment);
    });

    afterEach(() => {
      delete configValues.COMMISSION_DEFAULT_BPS;
      delete configValues.PAYOUT_HOLD_DAYS;
    });

    const pay = async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: PaymentStatus.PENDING });
      prisma.businessLedgerEntry.findFirst.mockResolvedValue(null);
      await service.updatePaymentStatus('pay-1', PaymentStatus.PAID, 'cs_test_123');
    };
    const created = () => prisma.businessLedgerEntry.create.mock.calls.map((c: [{ data: Record<string, any> }]) => c[0].data);

    it('books the sale on hold for 14 days by default and no commission when the rate is 0', async () => {
      await pay();
      const rows = created();
      expect(rows).toHaveLength(1);
      expect(rows[0].type).toBe('SALE');
      const days = (rows[0].availableAt.getTime() - Date.now()) / 86400000;
      expect(days).toBeGreaterThan(13.9);
      expect(days).toBeLessThan(14.1);
    });

    it('uses the platform default rate and PAYOUT_HOLD_DAYS', async () => {
      configValues.COMMISSION_DEFAULT_BPS = '500';
      configValues.PAYOUT_HOLD_DAYS = '7';
      await pay();
      const [sale, fee] = created();
      expect(sale).toMatchObject({ type: 'SALE', amountCents: 10000 });
      expect(fee).toMatchObject({ type: 'COMMISSION', amountCents: -500, rateBps: 500 });
      expect(fee.availableAt.getTime()).toBe(sale.availableAt.getTime());
      expect((sale.availableAt.getTime() - Date.now()) / 86400000).toBeLessThan(7.1);
    });

    it('prefers the plan rate over the platform default, including an explicit 0%', async () => {
      configValues.COMMISSION_DEFAULT_BPS = '500';
      prisma.businessSubscription.findUnique.mockResolvedValue({ plan: { commissionBps: 250 } });
      await pay();
      expect(created()[1]).toMatchObject({ type: 'COMMISSION', amountCents: -250, rateBps: 250 });

      prisma.businessLedgerEntry.create.mockClear();
      prisma.businessSubscription.findUnique.mockResolvedValue({ plan: { commissionBps: 0 } });
      await pay();
      expect(created()).toHaveLength(1);
    });

    it('does not book a second sale or commission when the payment is processed twice', async () => {
      configValues.COMMISSION_DEFAULT_BPS = '500';
      prisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: PaymentStatus.PENDING });
      prisma.businessLedgerEntry.findFirst.mockResolvedValue({ id: 'existing' });
      await service.updatePaymentStatus('pay-1', PaymentStatus.PAID, 'cs_test_123');
      expect(prisma.businessLedgerEntry.create).not.toHaveBeenCalled();
    });

    it('a refund inherits the sale hold date and gives back the proportional commission', async () => {
      const availableAt = new Date('2026-12-01');
      prisma.businessLedgerEntry.findFirst.mockResolvedValue({ availableAt });
      prisma.businessLedgerEntry.findMany
        .mockResolvedValueOnce([]) // refunds when reserving
        .mockResolvedValueOnce([{ amountCents: -4000 }]) // confirmed refunds
        .mockResolvedValueOnce([{ type: 'COMMISSION', amountCents: -500, rateBps: 500, businessId: 'biz-1', currency: 'EUR', availableAt, orderId: 'order-1', workshopBookingId: null }]); // commission rows

      await service.processRefund('pay-1', ownerA, { amount: 40 });

      const rows = created();
      expect(rows[0]).toMatchObject({ type: 'REFUND_PENDING', amountCents: -4000, availableAt });
      expect(rows[1]).toMatchObject({ type: 'COMMISSION_REVERSAL', amountCents: 200, availableAt });
    });

    it('never gives back more commission than was charged', async () => {
      const availableAt = new Date('2026-12-01');
      prisma.businessLedgerEntry.findFirst.mockResolvedValue({ availableAt });
      prisma.businessLedgerEntry.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ amountCents: -10000 }])
        .mockResolvedValueOnce([
          { type: 'COMMISSION', amountCents: -500, rateBps: 500, businessId: 'biz-1', currency: 'EUR', availableAt },
          { type: 'COMMISSION_REVERSAL', amountCents: 450 },
        ]);
      await service.processRefund('pay-1', ownerA, { amount: 100 });
      expect(created().find((r: any) => r.type === 'COMMISSION_REVERSAL')).toMatchObject({ amountCents: 50 });
    });
  });
});
