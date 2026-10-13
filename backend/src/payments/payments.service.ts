import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway';

const CURRENCY = 'EUR';

/** Ledger entry types used for refunds (amountCents is stored negative). */
const LEDGER_SALE = 'SALE';
const LEDGER_REFUND = 'REFUND';
const LEDGER_REFUND_PENDING = 'REFUND_PENDING';
const LEDGER_REFUND_FAILED = 'REFUND_FAILED';

const REFUNDABLE_STATUSES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED];

/** Allowed provider-driven status transitions (webhook handler). */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.AUTHORIZED, PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED],
  [PaymentStatus.AUTHORIZED]: [PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED],
  [PaymentStatus.PAID]: [],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.CANCELLED]: [],
  [PaymentStatus.EXPIRED]: [],
  [PaymentStatus.REFUNDED]: [],
  [PaymentStatus.PARTIALLY_REFUNDED]: [],
};

export function toCents(amount: number | string | { toString(): string }): number {
  return Math.round(Number(amount.toString()) * 100);
}

export interface RefundResult {
  paymentId: string;
  status: PaymentStatus;
  refundedCents: number;
  refundedAmount: number;
  replayed: boolean;
}

type EntityLink = { orderId: string } | { workshopBookingId: string } | { businessSubscriptionId: string };

type Reservation =
  | { kind: 'replay'; result: RefundResult }
  | { kind: 'reserved'; ledgerEntryId: string; providerTransactionId: string | null; currency: string };

export interface RefundInput {
  amount: number;
  reason?: string;
  idempotencyKey?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  // ==========================================
  // CREATE PAYMENT INTENT
  // ==========================================

  /**
   * Creates (or returns the already-open) PENDING payment for an entity.
   * The amount is ALWAYS derived from trusted server-side data; the DTO has no
   * amount field. Calling this twice for the same entity returns the same
   * payment (FR-PAY-07 idempotency); an already-paid entity is rejected.
   */
  async createPaymentIntent(actor: AuthUser, dto: CreatePaymentIntentDto) {
    const target = await this.resolveTarget(actor, dto);

    if (target.amountCents <= 0) {
      throw new BadRequestException('Payable amount must be greater than zero');
    }

    const link = target.link;
    const existing = await this.prisma.payment.findMany({
      where: { purpose: dto.purpose, ...link },
      orderBy: { createdAt: 'desc' },
    });

    if (existing.some((p) => p.status === PaymentStatus.PAID || p.status === PaymentStatus.PARTIALLY_REFUNDED)) {
      throw new ConflictException('This item has already been paid');
    }
    const open = existing.find(
      (p) => (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.AUTHORIZED) && p.provider === dto.provider,
    );
    if (open) {
      return this.toIntentResponse(open);
    }

    const payment = await this.prisma.payment.create({
      data: {
        purpose: dto.purpose,
        provider: dto.provider,
        method: dto.method,
        status: PaymentStatus.PENDING,
        amount: target.amountCents / 100,
        currency: CURRENCY,
        userId: actor.id,
        businessId: target.businessId,
        ...link,
      },
    });

    return this.toIntentResponse(payment);
  }

  private async resolveTarget(
    actor: AuthUser,
    dto: CreatePaymentIntentDto,
  ): Promise<{ amountCents: number; businessId: string; link: EntityLink }> {
    switch (dto.purpose) {
      case PaymentPurpose.PRODUCT_ORDER: {
        const order = await this.prisma.order.findUnique({ where: { id: dto.relatedEntityId } });
        if (!order) throw new NotFoundException('Order not found');
        this.assertConsumer(actor, order.consumerProfileId, 'Not authorized for this order');
        if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
          throw new ConflictException('This order can no longer be paid');
        }
        return { amountCents: toCents(order.totalAmount), businessId: order.businessId, link: { orderId: order.id } };
      }

      case PaymentPurpose.WORKSHOP_BOOKING: {
        const booking = await this.prisma.workshopBooking.findUnique({
          where: { id: dto.relatedEntityId },
          include: { workshop: { select: { businessId: true } } },
        });
        if (!booking) throw new NotFoundException('Workshop booking not found');
        this.assertConsumer(actor, booking.consumerProfileId, 'Not authorized for this workshop booking');
        if (booking.status === BookingStatus.CANCELLED) {
          throw new ConflictException('This booking was cancelled and can no longer be paid');
        }
        return {
          amountCents: toCents(booking.totalAmount),
          businessId: booking.workshop.businessId,
          link: { workshopBookingId: booking.id },
        };
      }

      case PaymentPurpose.BUSINESS_SUBSCRIPTION: {
        const sub = await this.prisma.businessSubscription.findUnique({
          where: { id: dto.relatedEntityId },
          include: { plan: true, business: { select: { id: true, ownerProfileId: true } } },
        });
        if (!sub) throw new NotFoundException('Business subscription not found');
        if (actor.role !== UserRole.BUSINESS_OWNER || !actor.profileId || sub.business.ownerProfileId !== actor.profileId) {
          throw new ForbiddenException('Not authorized for this business');
        }
        return {
          amountCents: toCents(sub.plan.monthlyPrice),
          businessId: sub.business.id,
          link: { businessSubscriptionId: sub.id },
        };
      }

      default:
        throw new BadRequestException('Invalid payment purpose');
    }
  }

  private assertConsumer(actor: AuthUser, consumerProfileId: string, message: string): void {
    if (actor.role !== UserRole.CONSUMER || !actor.profileId || actor.profileId !== consumerProfileId) {
      throw new ForbiddenException(message);
    }
  }

  private toIntentResponse(payment: { id: string; purpose: PaymentPurpose; provider: string; status: PaymentStatus; amount: unknown; currency: string; createdAt: Date }) {
    return {
      paymentId: payment.id,
      purpose: payment.purpose,
      provider: payment.provider,
      status: payment.status,
      amount: Number(String(payment.amount)),
      currency: payment.currency,
      createdAt: payment.createdAt,
    };
  }

  // ==========================================
  // READ
  // ==========================================

  async getPayment(paymentId: string, actor: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: { select: { consumerProfileId: true, businessId: true } },
        workshopBooking: { select: { consumerProfileId: true, workshop: { select: { businessId: true } } } },
        businessSubscription: { select: { businessId: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.assertCanViewPayment(payment, actor);

    const { order, workshopBooking, businessSubscription, ...rest } = payment;
    void order; void workshopBooking; void businessSubscription;
    return rest;
  }

  private paymentBusinessId(payment: {
    businessId: string | null;
    order?: { businessId: string } | null;
    workshopBooking?: { workshop: { businessId: string } } | null;
    businessSubscription?: { businessId: string } | null;
  }): string | null {
    return (
      payment.businessId ??
      payment.order?.businessId ??
      payment.workshopBooking?.workshop.businessId ??
      payment.businessSubscription?.businessId ??
      null
    );
  }

  private async assertCanViewPayment(
    payment: {
      purpose: PaymentPurpose;
      businessId: string | null;
      order?: { consumerProfileId: string; businessId: string } | null;
      workshopBooking?: { consumerProfileId: string; workshop: { businessId: string } } | null;
      businessSubscription?: { businessId: string } | null;
    },
    actor: AuthUser,
  ): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) return;

    if (actor.role === UserRole.CONSUMER) {
      const consumerProfileId = payment.order?.consumerProfileId ?? payment.workshopBooking?.consumerProfileId;
      if (actor.profileId && consumerProfileId === actor.profileId) return;
      throw new ForbiddenException('Not authorized for this payment');
    }

    if (actor.role === UserRole.BUSINESS_OWNER) {
      const businessId = this.paymentBusinessId(payment);
      if (businessId && (await this.ownsBusiness(actor, businessId))) return;
      throw new ForbiddenException('Not authorized for this payment');
    }

    throw new ForbiddenException('Not authorized for this payment');
  }

  private async ownsBusiness(actor: AuthUser, businessId: string): Promise<boolean> {
    if (actor.role !== UserRole.BUSINESS_OWNER || !actor.profileId) return false;
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    return !!business && business.ownerProfileId === actor.profileId;
  }

  async getBusinessPayments(businessId: string, actor: AuthUser) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const isAdmin = actor.role === UserRole.SUPER_ADMIN;
    const isOwner = actor.role === UserRole.BUSINESS_OWNER && !!actor.profileId && business.ownerProfileId === actor.profileId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Not authorized for this business');
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [
          { businessId },
          { order: { businessId } },
          { workshopBooking: { workshop: { businessId } } },
          { businessSubscription: { businessId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      subscriptionPayments: payments.filter((p) => p.purpose === PaymentPurpose.BUSINESS_SUBSCRIPTION),
      orderPayments: payments.filter((p) => p.purpose === PaymentPurpose.PRODUCT_ORDER),
      workshopBookingPayments: payments.filter((p) => p.purpose === PaymentPurpose.WORKSHOP_BOOKING),
    };
  }

  // ==========================================
  // PROVIDER STATUS UPDATE (webhook handler — not exposed over HTTP yet)
  // ==========================================

  /**
   * Applies a provider-confirmed status. Only valid transitions are applied;
   * re-delivery of the same status is a no-op (idempotent). Marks the related
   * order/booking/subscription and, for PAID sales, writes the gross ledger
   * entry once. MUST only be called from a verified provider webhook handler.
   */
  async updatePaymentStatus(paymentId: string, status: PaymentStatus, providerTransactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');

      if (payment.status === status) return payment;

      if (!ALLOWED_TRANSITIONS[payment.status].includes(status)) {
        throw new ConflictException(`Invalid payment status transition ${payment.status} -> ${status}`);
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          providerTransactionId,
          paidAt: status === PaymentStatus.PAID ? new Date() : undefined,
        },
      });

      if (payment.orderId) {
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: status } });
      }
      if (status === PaymentStatus.PAID) {
        if (payment.workshopBookingId) {
          await tx.workshopBooking.update({ where: { id: payment.workshopBookingId }, data: { status: BookingStatus.CONFIRMED } });
        }
        if (payment.businessSubscriptionId) {
          await tx.businessSubscription.update({
            where: { id: payment.businessSubscriptionId },
            data: { status: SubscriptionStatus.ACTIVE },
          });
        }
        if (payment.businessId && (payment.orderId || payment.workshopBookingId)) {
          const already = await tx.businessLedgerEntry.findFirst({ where: { paymentId, type: LEDGER_SALE } });
          if (!already) {
            await tx.businessLedgerEntry.create({
              data: {
                businessId: payment.businessId,
                paymentId,
                orderId: payment.orderId,
                workshopBookingId: payment.workshopBookingId,
                type: LEDGER_SALE,
                amountCents: toCents(payment.amount),
                currency: payment.currency,
              },
            });
          }
        }
      }
      return updated;
    });
  }

  // ==========================================
  // REFUNDS
  // ==========================================

  /**
   * Refund flow (two transactions around the provider call):
   *  1. Under a row lock on the payment: authorize, validate the amount against
   *     the refundable balance (paid − confirmed − in-flight refunds), de-duplicate
   *     on the idempotency key, reserve the amount (REFUND_PENDING) and audit it.
   *  2. Call the PSP. Only if it confirms is the reservation turned into a
   *     REFUND and the payment status moved to (PARTIALLY_)REFUNDED. On provider
   *     failure the reservation is released and nothing is reported as refunded.
   */
  async processRefund(paymentId: string, actor: AuthUser, input: RefundInput) {
    const amountCents = this.validateRefundAmount(input.amount);

    if (!this.gateway.isConfigured()) {
      // Fail before reserving anything: a refund must never look completed
      // when no provider can confirm it.
      throw new ServiceUnavailableException('No payment provider is configured; refunds cannot be processed');
    }

    const reservation = await this.reserveRefund(paymentId, actor, amountCents, input);
    if (reservation.kind === 'replay') return reservation.result;

    let providerRefundId: string;
    try {
      const result = await this.gateway.refund({
        paymentId,
        providerTransactionId: reservation.providerTransactionId,
        amountCents,
        currency: reservation.currency,
        idempotencyKey: reservation.ledgerEntryId,
      });
      providerRefundId = result.providerRefundId;
    } catch (err) {
      await this.releaseRefund(paymentId, reservation.ledgerEntryId, actor, amountCents);
      this.logger.error(`Provider refund failed for payment ${paymentId}`);
      if (err instanceof Error && 'getStatus' in err) throw err;
      throw new BadGatewayException('The payment provider could not process the refund');
    }

    return this.confirmRefund(paymentId, reservation.ledgerEntryId, actor, amountCents, providerRefundId, input.reason);
  }

  private validateRefundAmount(amount: number): number {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new BadRequestException('Refund amount must be a number');
    }
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }
    const cents = toCents(amount);
    if (Math.abs(cents / 100 - amount) > 1e-9) {
      throw new BadRequestException('Refund amount can have at most 2 decimals');
    }
    return cents;
  }

  private async reserveRefund(paymentId: string, actor: AuthUser, amountCents: number, input: RefundInput): Promise<Reservation> {
    return this.prisma.$transaction(async (tx) => {
      // Serialises concurrent refunds on the same payment.
      await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;

      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: { select: { businessId: true } },
          workshopBooking: { select: { workshop: { select: { businessId: true } } } },
          businessSubscription: { select: { businessId: true } },
        },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      await this.assertCanRefund(payment, actor);

      if (input.idempotencyKey) {
        const prior = await tx.auditLog.findFirst({
          where: {
            action: 'PAYMENT_REFUND_REQUESTED',
            targetType: 'PAYMENT',
            targetId: paymentId,
            metadata: { path: ['idempotencyKey'], equals: input.idempotencyKey },
          },
        });
        if (prior) {
          const meta = (prior.metadata ?? {}) as { ledgerEntryId?: string; amountCents?: number };
          const entry = meta.ledgerEntryId
            ? await tx.businessLedgerEntry.findUnique({ where: { id: meta.ledgerEntryId } })
            : null;
          if (meta.amountCents !== amountCents) {
            throw new ConflictException('Idempotency key was already used with a different amount');
          }
          if (entry?.type === LEDGER_REFUND) {
            return {
              kind: 'replay',
              result: { paymentId, status: payment.status, refundedCents: Math.abs(entry.amountCents), refundedAmount: Math.abs(entry.amountCents) / 100, replayed: true },
            };
          }
          throw new ConflictException('A refund with this idempotency key is already in progress or failed; use a new key');
        }
      }

      if (!REFUNDABLE_STATUSES.includes(payment.status)) {
        throw new BadRequestException('Only paid payments can be refunded');
      }

      const entries = await tx.businessLedgerEntry.findMany({
        where: { paymentId, type: { in: [LEDGER_REFUND, LEDGER_REFUND_PENDING] } },
      });
      const alreadyCents = entries.reduce((sum, e) => sum + Math.abs(e.amountCents), 0);
      const refundableCents = toCents(payment.amount) - alreadyCents;
      if (amountCents > refundableCents) {
        throw new BadRequestException(`Refund exceeds the refundable balance (${(refundableCents / 100).toFixed(2)} ${payment.currency})`);
      }

      const businessId = this.paymentBusinessId(payment);
      if (!businessId) {
        throw new BadRequestException('Payment is not linked to a business');
      }

      const entry = await tx.businessLedgerEntry.create({
        data: {
          businessId,
          paymentId,
          orderId: payment.orderId,
          workshopBookingId: payment.workshopBookingId,
          type: LEDGER_REFUND_PENDING,
          amountCents: -amountCents,
          currency: payment.currency,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: 'PAYMENT_REFUND_REQUESTED',
          targetType: 'PAYMENT',
          targetId: paymentId,
          metadata: { amountCents, reason: input.reason ?? null, idempotencyKey: input.idempotencyKey ?? null, ledgerEntryId: entry.id },
        },
      });

      return {
        kind: 'reserved',
        ledgerEntryId: entry.id,
        providerTransactionId: payment.providerTransactionId,
        currency: payment.currency,
      };
    });
  }

  private async assertCanRefund(
    payment: {
      purpose: PaymentPurpose;
      businessId: string | null;
      order?: { businessId: string } | null;
      workshopBooking?: { workshop: { businessId: string } } | null;
      businessSubscription?: { businessId: string } | null;
    },
    actor: AuthUser,
  ): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) return;

    if (actor.role === UserRole.BUSINESS_OWNER) {
      // A business may refund its own customers' payments, never its own
      // platform subscription fee (that is a platform-admin decision).
      if (payment.purpose === PaymentPurpose.BUSINESS_SUBSCRIPTION) {
        throw new ForbiddenException('Subscription payments can only be refunded by a platform administrator');
      }
      const businessId = this.paymentBusinessId(payment);
      if (businessId && (await this.ownsBusiness(actor, businessId))) return;
    }
    throw new ForbiddenException('Not authorized to refund this payment');
  }

  private async releaseRefund(paymentId: string, ledgerEntryId: string, actor: AuthUser, amountCents: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.businessLedgerEntry.update({ where: { id: ledgerEntryId }, data: { type: LEDGER_REFUND_FAILED } });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: 'PAYMENT_REFUND_FAILED',
          targetType: 'PAYMENT',
          targetId: paymentId,
          metadata: { amountCents, ledgerEntryId },
        },
      });
    });
  }

  private async confirmRefund(
    paymentId: string,
    ledgerEntryId: string,
    actor: AuthUser,
    amountCents: number,
    providerRefundId: string,
    reason?: string,
  ): Promise<RefundResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.businessLedgerEntry.update({ where: { id: ledgerEntryId }, data: { type: LEDGER_REFUND } });

      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');

      const confirmed = await tx.businessLedgerEntry.findMany({ where: { paymentId, type: LEDGER_REFUND } });
      const refundedCents = confirmed.reduce((sum, e) => sum + Math.abs(e.amountCents), 0);
      const status = refundedCents >= toCents(payment.amount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

      await tx.payment.update({ where: { id: paymentId }, data: { status, refundedAt: new Date() } });
      if (payment.orderId) {
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: status } });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: 'PAYMENT_REFUNDED',
          targetType: 'PAYMENT',
          targetId: paymentId,
          metadata: { amountCents, refundedCents, providerRefundId, reason: reason ?? null, ledgerEntryId },
        },
      });

      return { paymentId, status, refundedCents, refundedAmount: refundedCents / 100, replayed: false };
    });
  }
}
