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
import { PAYMENT_GATEWAY } from './payment-gateway';
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
  provider: PaymentProvider.MOLLIE,
  status: PaymentStatus.PAID,
  amount: 100,
  currency: 'EUR',
  providerTransactionId: 'tr_123',
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
  const gateway = { isConfigured: jest.fn(), refund: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    gateway.isConfigured.mockReturnValue(true);
    gateway.refund.mockResolvedValue({ providerRefundId: 're_1' });

    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      workshopBooking: { findUnique: jest.fn(), update: jest.fn() },
      businessSubscription: { findUnique: jest.fn(), update: jest.fn() },
      business: { findUnique: jest.fn() },
      payment: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      businessLedgerEntry: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      auditLog: { findFirst: jest.fn(), create: jest.fn() },
      $queryRaw: jest.fn(),
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
      providers: [PaymentsService, { provide: PrismaService, useValue: prisma }, { provide: PAYMENT_GATEWAY, useValue: gateway }],
    }).compile();
    service = module.get(PaymentsService);
  });

  const intent = (purpose: PaymentPurpose, relatedEntityId: string): CreatePaymentIntentDto => ({
    purpose,
    relatedEntityId,
    provider: PaymentProvider.MOLLIE,
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
        service.createPaymentIntent(consumerA, { purpose: 'GIFT_CARD' as PaymentPurpose, relatedEntityId: 'x', provider: PaymentProvider.MOLLIE }),
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
      prisma.payment.findMany.mockResolvedValue([{ ...basePayment, id: 'pay-open', status: PaymentStatus.PENDING }]);
      const result = await service.createPaymentIntent(consumerA, intent(PaymentPurpose.PRODUCT_ORDER, 'order-1'));
      expect(result.paymentId).toBe('pay-open');
      expect(prisma.payment.create).not.toHaveBeenCalled();
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

      await service.updatePaymentStatus('pay-1', PaymentStatus.PAID, 'tr_123');

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
      await service.updatePaymentStatus('pay-1', PaymentStatus.PAID, 'tr_123');
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

      expect(gateway.refund).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 2500, currency: 'EUR', providerTransactionId: 'tr_123' }));
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
});
