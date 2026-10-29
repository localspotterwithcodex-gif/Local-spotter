import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  EmployeeStatus,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  UserRole,
  PaymentMethod,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/types/auth-user';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PAYMENT_GATEWAY, PaymentGateway, GatewayPaymentStatus, paymentsUnavailable, providerError } from './payment-gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { LEDGER, commissionCents, commissionReversalCents, DEFAULT_HOLD_DAYS } from '../finance/ledger';

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

type EntityLink =
  | { orderId: string; customerOrderId?: string }
  | { workshopBookingId: string }
  | { businessSubscriptionId: string };

/** One Payment row per paid-to business; all rows of one checkout share the provider payment. */
interface PaymentPart {
  amountCents: number;
  businessId: string;
  link: EntityLink;
}

interface PaymentTarget {
  parts: PaymentPart[];
  /** Where already-created payments of this entity are looked up (and the lock key). */
  scope: { customerOrderId: string } | { orderId: string } | { workshopBookingId: string } | { businessSubscriptionId: string };
  scopeId: string;
  description: string;
}

/** Unpaid orders and bookings are released after this many minutes. */
export const UNPAID_HOLD_MINUTES = 30;

const GATEWAY_TO_PAYMENT: Record<GatewayPaymentStatus, PaymentStatus> = {
  PENDING: PaymentStatus.PENDING,
  AUTHORIZED: PaymentStatus.AUTHORIZED,
  PAID: PaymentStatus.PAID,
  FAILED: PaymentStatus.FAILED,
  CANCELLED: PaymentStatus.CANCELLED,
  EXPIRED: PaymentStatus.EXPIRED,
};

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
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ==========================================
  // CREATE PAYMENT INTENT
  // ==========================================

  /**
   * Starts (or returns the already-open) hosted checkout for an entity.
   * The amount is ALWAYS derived from trusted server-side data; the DTO has no
   * amount field. Calling this twice for the same entity returns the same
   * open checkout (FR-PAY-07 idempotency); an already-paid entity is rejected.
   * A multi-store checkout is ONE provider payment recorded as one Payment row
   * per store, so ledger, refunds and statuses stay per store.
   */
  async createPaymentIntent(actor: AuthUser, dto: CreatePaymentIntentDto) {
    if (!this.gateway.isConfigured()) {
      throw paymentsUnavailable('No payment provider is configured; payments cannot be started');
    }
    const provider = dto.provider ?? PaymentProvider.STRIPE;
    if (provider !== PaymentProvider.STRIPE) {
      throw new BadRequestException('Unsupported payment provider');
    }

    const target = await this.resolveTarget(actor, dto);
    const totalCents = target.parts.reduce((sum, p) => sum + p.amountCents, 0);
    if (totalCents <= 0 || target.parts.some((p) => p.amountCents <= 0)) {
      throw new BadRequestException('Payable amount must be greater than zero');
    }

    // Step 1 (under an advisory lock so a double click cannot create two checkouts).
    const step = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${target.scopeId}, 0))`;
      const existing = await tx.payment.findMany({
        where: { purpose: dto.purpose, ...target.scope },
        orderBy: { createdAt: 'desc' },
      });
      if (existing.some((p) => p.status === PaymentStatus.PAID || p.status === PaymentStatus.PARTIALLY_REFUNDED)) {
        throw new ConflictException('This item has already been paid');
      }
      const open = existing.find(
        (p) => (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.AUTHORIZED) && !!p.providerTransactionId && !!p.checkoutUrl,
      );
      if (open) return { kind: 'open' as const, payment: open, totalCents };

      const rows = [];
      for (const part of target.parts) {
        rows.push(
          await tx.payment.create({
            data: {
              purpose: dto.purpose,
              provider,
              method: PaymentMethod.IDEAL,
              status: PaymentStatus.PENDING,
              amount: part.amountCents / 100,
              currency: CURRENCY,
              userId: actor.id,
              businessId: part.businessId,
              description: target.description,
              ...part.link,
            },
          }),
        );
      }
      return { kind: 'created' as const, rows };
    });

    if (step.kind === 'open') {
      const sum = await this.sumGroupCents(step.payment);
      return this.toIntentResponse(step.payment, sum);
    }

    // Step 2: provider call outside the transaction.
    const rows = step.rows;
    const first = rows[0];
    let created: { providerPaymentId: string; checkoutUrl: string | null };
    try {
      created = await this.gateway.createPayment({
        amountCents: totalCents,
        currency: CURRENCY,
        description: target.description,
        redirectUrl: this.redirectUrl(first.id),
        method: this.gatewayMethod(),
        metadata: { purpose: dto.purpose, scopeId: target.scopeId, paymentId: first.id },
        idempotencyKey: `intent-${first.id}`,
        locale: 'nl_NL',
      });
    } catch (err) {
      await this.prisma.payment.updateMany({ where: { id: { in: rows.map((r) => r.id) }, status: PaymentStatus.PENDING }, data: { status: PaymentStatus.FAILED } });
      this.logger.error(`Could not start provider payment for ${dto.purpose} ${target.scopeId}`);
      if (err instanceof Error && 'getStatus' in err) throw err;
      throw providerError('The payment provider could not start the payment');
    }

    await this.prisma.payment.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { providerTransactionId: created.providerPaymentId, checkoutUrl: created.checkoutUrl },
    });
    return this.toIntentResponse({ ...first, providerTransactionId: created.providerPaymentId, checkoutUrl: created.checkoutUrl }, totalCents);
  }

  /** After start-up, trial the provider once so a misconfiguration is named in the server log before any customer hits it. */
  onApplicationBootstrap(): void {
    if (!this.gateway.isConfigured() || process.env.NODE_ENV === 'test') return;
    setTimeout(() => {
      this.diagnose()
        .then((d) =>
          d.ok
            ? this.logger.log('Payment setup check: Stripe accepted a trial iDEAL checkout')
            : this.logger.error(`Payment setup check FAILED: key=${d.keyKind} frontendUrlValid=${d.frontendUrlValid} status=${d.httpStatus} code=${d.code} param=${d.param} message=${d.message} | ${d.hint}`),
        )
        .catch(() => this.logger.error('Payment setup check could not run'));
    }, 5000).unref();
  }

  /** Admin check: runs a trial checkout and returns Stripe's own reason if it is refused. */
  diagnose() {
    return this.gateway.diagnose(this.frontendUrl());
  }

  private frontendUrl(): string {
    // Tolerate a value without scheme or with quotes/spaces: Stripe rejects a return URL that is not absolute (400 invalid_request_error).
    let url = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').trim().replace(/^["']|["']$/g, '').trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    return url.replace(/\/+$/, '');
  }

  private redirectUrl(paymentId: string): string {
    return `${this.frontendUrl()}/payment/return?payment=${encodeURIComponent(paymentId)}`;
  }

  /** iDEAL is the only payment method offered. */
  private gatewayMethod(): 'IDEAL' {
    return 'IDEAL';
  }

  /** Total of all rows that belong to the same provider payment. */
  private async sumGroupCents(payment: { providerTransactionId: string | null; amount: unknown }): Promise<number> {
    if (!payment.providerTransactionId) return toCents(String(payment.amount));
    const rows = await this.prisma.payment.findMany({ where: { providerTransactionId: payment.providerTransactionId }, select: { amount: true } });
    return rows.reduce((sum, r) => sum + toCents(String(r.amount)), 0);
  }

  private async resolveTarget(actor: AuthUser, dto: CreatePaymentIntentDto): Promise<PaymentTarget> {
    switch (dto.purpose) {
      case PaymentPurpose.PRODUCT_ORDER: {
        const checkout = await this.prisma.customerOrder.findUnique({
          where: { id: dto.relatedEntityId },
          include: { orders: { select: { id: true, businessId: true, totalAmount: true, status: true } } },
        });
        if (checkout) {
          this.assertConsumer(actor, checkout.consumerProfileId, 'Not authorized for this order');
          const payable = checkout.orders.filter((o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED);
          if (checkout.cancelledAt || payable.length === 0) {
            throw new ConflictException('This order can no longer be paid');
          }
          return {
            parts: payable.map((o) => ({
              amountCents: toCents(o.totalAmount),
              businessId: o.businessId,
              link: { orderId: o.id, customerOrderId: checkout.id },
            })),
            scope: { customerOrderId: checkout.id },
            scopeId: checkout.id,
            description: `LocalSpotter ${checkout.orderNumber}`,
          };
        }
        // Orders created before the checkout grouping existed.
        const order = await this.prisma.order.findUnique({ where: { id: dto.relatedEntityId } });
        if (!order) throw new NotFoundException('Order not found');
        this.assertConsumer(actor, order.consumerProfileId, 'Not authorized for this order');
        if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
          throw new ConflictException('This order can no longer be paid');
        }
        return {
          parts: [{ amountCents: toCents(order.totalAmount), businessId: order.businessId, link: { orderId: order.id } }],
          scope: { orderId: order.id },
          scopeId: order.id,
          description: `LocalSpotter ${order.orderNumber}`,
        };
      }

      case PaymentPurpose.WORKSHOP_BOOKING: {
        const booking = await this.prisma.workshopBooking.findUnique({
          where: { id: dto.relatedEntityId },
          include: { workshop: { select: { businessId: true, title: true } } },
        });
        if (!booking) throw new NotFoundException('Workshop booking not found');
        this.assertConsumer(actor, booking.consumerProfileId, 'Not authorized for this workshop booking');
        if (booking.status === BookingStatus.CANCELLED) {
          throw new ConflictException('This booking was cancelled and can no longer be paid');
        }
        return {
          parts: [{ amountCents: toCents(booking.totalAmount), businessId: booking.workshop.businessId, link: { workshopBookingId: booking.id } }],
          scope: { workshopBookingId: booking.id },
          scopeId: booking.id,
          description: `Workshop ${booking.workshop.title}`.slice(0, 120),
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
          parts: [{ amountCents: toCents(sub.plan.monthlyPrice), businessId: sub.business.id, link: { businessSubscriptionId: sub.id } }],
          scope: { businessSubscriptionId: sub.id },
          scopeId: sub.id,
          description: `LocalSpotter ${sub.plan.name}`.slice(0, 120),
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

  private toIntentResponse(
    payment: { id: string; purpose: PaymentPurpose; provider: string; status: PaymentStatus; currency: string; createdAt: Date; checkoutUrl?: string | null },
    totalCents: number,
  ) {
    return {
      paymentId: payment.id,
      purpose: payment.purpose,
      provider: payment.provider,
      status: payment.status,
      amount: totalCents / 100,
      currency: payment.currency,
      checkoutUrl: payment.checkoutUrl ?? null,
      createdAt: payment.createdAt,
    };
  }

  // ==========================================
  // READ
  // ==========================================

  async getPayment(paymentId: string, actor: AuthUser) {
    let payment = await this.loadPaymentForView(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');

    await this.assertCanViewPayment(payment, actor);

    // The customer lands on the return page before (or without) the webhook:
    // ask the provider, the single source of truth, while the payment is open.
    if (
      payment.providerTransactionId &&
      (payment.status === PaymentStatus.PENDING || payment.status === PaymentStatus.AUTHORIZED) &&
      this.gateway.isConfigured() &&
      Date.now() - payment.updatedAt.getTime() > 2000
    ) {
      try {
        await this.syncFromProvider(payment.providerTransactionId);
        payment = (await this.loadPaymentForView(paymentId)) ?? payment;
      } catch {
        /* keep the stored status; the webhook or the next poll will catch up */
      }
    }

    const { order, workshopBooking, businessSubscription, ...rest } = payment;
    void order; void workshopBooking; void businessSubscription;
    return rest;
  }

  private loadPaymentForView(paymentId: string) {
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: { select: { consumerProfileId: true, businessId: true } },
        workshopBooking: { select: { consumerProfileId: true, workshop: { select: { businessId: true } } } },
        businessSubscription: { select: { businessId: true } },
      },
    });
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
  // PROVIDER STATUS UPDATE (webhook + return-page sync)
  // ==========================================

  /**
   * Entry point of the provider webhook (already signature-checked by the controller). Only the
   * Checkout Session id is taken from the event: status, amount and metadata are read back from
   * the provider API, and an unknown id is ignored. Throws when the provider cannot be reached
   * so that Stripe retries the delivery.
   */
  async handleProviderWebhook(providerPaymentId: string): Promise<void> {
    if (!/^cs_(test|live)_[A-Za-z0-9]{8,200}$/.test(providerPaymentId)) return;
    if (!this.gateway.isConfigured()) return;
    await this.syncFromProvider(providerPaymentId);
  }

  /** Reads the provider status and applies it to every Payment row of that provider payment. Idempotent. */
  async syncFromProvider(providerPaymentId: string): Promise<void> {
    const rows = await this.prisma.payment.findMany({
      where: { provider: PaymentProvider.STRIPE, providerTransactionId: providerPaymentId },
    });
    if (rows.length === 0) return;

    const info = await this.gateway.getPayment(providerPaymentId);
    const expectedCents = rows.reduce((sum, r) => sum + toCents(r.amount), 0);
    const ids = new Set(rows.map((r) => r.id));
    if (info.amountCents !== expectedCents || info.currency !== rows[0].currency || !ids.has(info.metadata.paymentId)) {
      // Never mark anything paid when provider data and our records disagree.
      this.logger.error(`Provider payment ${providerPaymentId} does not match our records; ignored`);
      return;
    }

    const status = GATEWAY_TO_PAYMENT[info.status];
    const eventId = `${providerPaymentId}:${info.status}`;
    await this.prisma.paymentWebhookEvent
      .create({ data: { provider: PaymentProvider.STRIPE, providerEventId: eventId, eventType: `payment.${info.status.toLowerCase()}`, payload: { status: info.status }, processed: false } })
      .catch(() => undefined); // already recorded (redelivery)

    for (const row of rows) {
      try {
        await this.updatePaymentStatus(row.id, status, providerPaymentId);
      } catch (err) {
        if (err instanceof ConflictException) {
          this.logger.warn(`Ignored status ${status} for payment ${row.id}: ${err.message}`);
          continue;
        }
        throw err;
      }
    }
    await this.prisma.paymentWebhookEvent
      .updateMany({ where: { provider: PaymentProvider.STRIPE, providerEventId: eventId }, data: { processed: true, processedAt: new Date() } })
      .catch(() => undefined);
  }

  /**
   * Applies a provider-confirmed status. Only valid transitions are applied;
   * re-delivery of the same status is a no-op (idempotent). Marks the related
   * order/booking/subscription and, for PAID sales, writes the gross ledger
   * entry once. MUST only be called with a status read from the provider.
   */
  async updatePaymentStatus(paymentId: string, status: PaymentStatus, providerTransactionId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');

      if (payment.status === status) return { payment, changed: false };

      if (!ALLOWED_TRANSITIONS[payment.status].includes(status)) {
        throw new ConflictException(`Invalid payment status transition ${payment.status} -> ${status}`);
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          providerTransactionId,
          paidAt: status === PaymentStatus.PAID ? new Date() : undefined,
          checkoutUrl: status === PaymentStatus.PAID || status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED || status === PaymentStatus.EXPIRED ? null : undefined,
        },
      });

      if (payment.orderId) {
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: status } });
      }
      if (status === PaymentStatus.PAID) {
        if (payment.customerOrderId) {
          await tx.customerOrder.update({
            where: { id: payment.customerOrderId },
            data: { paymentStatus: PaymentStatus.PAID, paidAt: new Date() },
          });
        }
        if (payment.workshopBookingId) {
          await tx.workshopBooking.updateMany({
            where: { id: payment.workshopBookingId, status: BookingStatus.PENDING },
            data: { status: BookingStatus.CONFIRMED },
          });
        }
        if (payment.businessSubscriptionId) {
          const sub = await tx.businessSubscription.findUnique({ where: { id: payment.businessSubscriptionId } });
          if (sub) {
            const now = new Date();
            // Early renewals extend the running period instead of losing paid days.
            const renewing = sub.status === SubscriptionStatus.ACTIVE && sub.currentPeriodEnd > now;
            const start = renewing ? sub.currentPeriodEnd : now;
            await tx.businessSubscription.update({
              where: { id: sub.id },
              data: {
                status: SubscriptionStatus.ACTIVE,
                provider: PaymentProvider.STRIPE,
                currentPeriodStart: renewing ? sub.currentPeriodStart : now,
                currentPeriodEnd: new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000),
                cancelledAt: null,
              },
            });
          }
        }
        if (payment.businessId && (payment.orderId || payment.workshopBookingId)) {
          const already = await tx.businessLedgerEntry.findFirst({ where: { paymentId, type: LEDGER_SALE } });
          if (!already) {
            const grossCents = toCents(payment.amount);
            const availableAt = new Date(Date.now() + this.holdDays() * 24 * 60 * 60 * 1000);
            const rateBps = await this.commissionRateBps(tx, payment.businessId);
            const common = {
              businessId: payment.businessId,
              paymentId,
              orderId: payment.orderId,
              workshopBookingId: payment.workshopBookingId,
              currency: payment.currency,
              availableAt,
            };
            await tx.businessLedgerEntry.create({
              data: { ...common, type: LEDGER_SALE, amountCents: grossCents },
            });
            const fee = commissionCents(grossCents, rateBps);
            if (fee > 0) {
              await tx.businessLedgerEntry.create({
                data: { ...common, type: LEDGER.COMMISSION, amountCents: -fee, rateBps },
              });
            }
          }
        }
      }
      return { payment: updated, changed: true };
    });

    if (result.changed && status === PaymentStatus.PAID) {
      await this.afterPaid(result.payment);
    }
    return result.payment;
  }

  /** Days a sale stays on hold before it is available for payout (PAYOUT_HOLD_DAYS, default 14). */
  private holdDays(): number {
    const raw = Number(this.config.get<string>('PAYOUT_HOLD_DAYS'));
    return Number.isInteger(raw) && raw >= 0 ? raw : DEFAULT_HOLD_DAYS;
  }

  /** Commission of a store in basis points: its plan's rate, else COMMISSION_DEFAULT_BPS, else 0. */
  private async commissionRateBps(tx: Prisma.TransactionClient, businessId: string): Promise<number> {
    const sub = await tx.businessSubscription.findUnique({
      where: { businessId },
      select: { plan: { select: { commissionBps: true } } },
    });
    if (sub?.plan.commissionBps !== null && sub?.plan.commissionBps !== undefined) return sub.plan.commissionBps;
    const raw = Number(this.config.get<string>('COMMISSION_DEFAULT_BPS'));
    return Number.isInteger(raw) && raw > 0 ? raw : 0;
  }

  /** Post-commit side effects of a confirmed payment. Never throws. */
  private async afterPaid(payment: {
    id: string;
    purpose: PaymentPurpose;
    orderId: string | null;
    workshopBookingId: string | null;
    businessSubscriptionId: string | null;
    businessId: string | null;
    userId: string | null;
  }): Promise<void> {
    try {
      if (payment.orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: payment.orderId },
          include: { consumerProfile: { select: { userId: true } } },
        });
        if (!order) return;
        if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED) {
          // Paid after we released the order: give the money back.
          await this.refundPaymentRemainder(payment.id, 'Payment received after the order was cancelled');
          await this.notifications.notifyUser(order.consumerProfile.userId, NotificationType.ORDER, 'Betaling terugbetaald', `Je betaling voor bestelling ${order.orderNumber} kwam binnen nadat de bestelling was geannuleerd en wordt terugbetaald.`, { linkUrl: '/account/orders', email: true });
          return;
        }
        await this.notifications.notifyUser(order.consumerProfile.userId, NotificationType.ORDER, 'Betaling ontvangen', `Bedankt! Bestelling ${order.orderNumber} is betaald en doorgegeven aan de winkel.`, { linkUrl: '/account/orders', email: true });
        await this.notifyBusinessTeam(order.businessId, NotificationType.ORDER, 'Nieuwe bestelling', `Bestelling ${order.orderNumber} is betaald (€${Number(String(order.totalAmount)).toFixed(2)}).`, '/owner/orders');
      } else if (payment.workshopBookingId) {
        const booking = await this.prisma.workshopBooking.findUnique({
          where: { id: payment.workshopBookingId },
          include: { workshop: { select: { id: true, title: true, businessId: true } }, consumerProfile: { select: { userId: true } } },
        });
        if (!booking) return;
        if (booking.status === BookingStatus.CANCELLED) {
          await this.refundPaymentRemainder(payment.id, 'Payment received after the booking was cancelled');
          await this.notifications.notifyUser(booking.consumerProfile.userId, NotificationType.BOOKING, 'Betaling terugbetaald', `Je betaling voor "${booking.workshop.title}" kwam binnen nadat de boeking was geannuleerd en wordt terugbetaald.`, { linkUrl: '/account/orders', email: true });
          return;
        }
        await this.notifications.notifyUser(booking.consumerProfile.userId, NotificationType.BOOKING, `Boeking bevestigd: ${booking.workshop.title}`, `Je betaling is ontvangen en je plaats voor "${booking.workshop.title}" is bevestigd.`, { linkUrl: '/account/orders', email: true });
        await this.notifyBusinessTeam(booking.workshop.businessId, NotificationType.BOOKING, `Nieuwe boeking: ${booking.workshop.title}`, 'Een nieuwe boeking is betaald.', `/owner/workshops/${booking.workshop.id}/participants`);
      } else if (payment.businessSubscriptionId && payment.businessId) {
        await this.notifyOwnerOnly(payment.businessId, NotificationType.SUBSCRIPTION, 'Abonnement actief', 'Je betaling is ontvangen en je abonnement is actief.', '/owner/subscription');
      }
    } catch (err) {
      this.logger.error(`Post-payment side effects failed for payment ${payment.id}`);
    }
  }

  /** Owner (preference-aware) plus active staff. Best effort. */
  private async notifyBusinessTeam(businessId: string, type: NotificationType, title: string, message: string, linkUrl: string) {
    if (type === NotificationType.ORDER) {
      await this.notifications.notifyBusinessOwner(businessId, 'ORDER', title, message, linkUrl); // honours the owner's order preference
    } else {
      await this.notifyOwnerOnly(businessId, type, title, message, linkUrl);
    }
    const staff = await this.prisma.merchantEmployee.findMany({
      where: { businessId, status: EmployeeStatus.ACTIVE, userId: { not: null } },
      select: { userId: true },
    });
    for (const member of staff) {
      if (member.userId) await this.notifications.notifyUser(member.userId, type, title, message, { linkUrl });
    }
  }

  private async notifyOwnerOnly(businessId: string, type: NotificationType, title: string, message: string, linkUrl: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerProfile: { select: { userId: true } } },
    });
    const ownerUserId = business?.ownerProfile?.userId;
    if (ownerUserId) await this.notifications.notifyUser(ownerUserId, type, title, message, { linkUrl });
  }

  // ==========================================
  // UNPAID CHECKOUT EXPIRY (called by the scheduler)
  // ==========================================

  /**
   * Releases checkouts that were not paid within UNPAID_HOLD_MINUTES: orders are
   * cancelled and the reserved stock returns to the shelf. The provider is asked
   * first, so a payment that just succeeded is never cancelled. A payment that
   * still arrives later is refunded automatically (see afterPaid).
   */
  async expireUnpaidCheckouts(now = new Date()): Promise<{ checked: number; released: number }> {
    const cutoff = new Date(now.getTime() - UNPAID_HOLD_MINUTES * 60 * 1000);
    const stale = await this.prisma.customerOrder.findMany({
      where: { paymentStatus: { not: PaymentStatus.PAID }, cancelledAt: null, createdAt: { lt: cutoff } },
      include: { payments: { select: { providerTransactionId: true, status: true } }, orders: { include: { items: true } } },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    let released = 0;
    for (const checkout of stale) {
      try {
        const providerIds = [...new Set(checkout.payments.filter((p) => p.providerTransactionId && (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.AUTHORIZED)).map((p) => p.providerTransactionId as string))];
        for (const id of providerIds) {
          await this.syncFromProvider(id);
        }
        const fresh = await this.prisma.customerOrder.findUnique({ where: { id: checkout.id }, select: { paymentStatus: true } });
        if (!fresh || fresh.paymentStatus === PaymentStatus.PAID) continue;

        const didRelease = await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.customerOrder.updateMany({
            where: { id: checkout.id, cancelledAt: null, paymentStatus: { not: PaymentStatus.PAID } },
            data: { cancelledAt: now, paymentStatus: PaymentStatus.EXPIRED },
          });
          if (claimed.count === 0) return false;
          for (const order of checkout.orders) {
            const cancelled = await tx.order.updateMany({
              where: { id: order.id, status: OrderStatus.PENDING },
              data: { status: OrderStatus.CANCELLED, cancelledAt: now, paymentStatus: PaymentStatus.EXPIRED },
            });
            if (cancelled.count === 0) continue;
            for (const item of order.items) {
              if (item.productVariantId) {
                await tx.$executeRaw`UPDATE "product_variants" SET "stock" = "stock" + ${item.quantity}, "updated_at" = NOW() WHERE "id" = ${item.productVariantId}::uuid`;
              } else {
                await tx.$executeRaw`UPDATE "products" SET "stock" = "stock" + ${item.quantity}, "updated_at" = NOW() WHERE "id" = ${item.productId}::uuid`;
              }
            }
            await tx.orderStatusEvent.create({ data: { orderId: order.id, fromStatus: OrderStatus.PENDING, toStatus: OrderStatus.CANCELLED, reason: 'Betaling niet binnen de gestelde tijd voltooid' } });
          }
          return true;
        });
        if (didRelease) released += 1;
      } catch (err) {
        this.logger.error(`Could not expire checkout ${checkout.id}`);
      }
    }
    return { checked: stale.length, released };
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
  async processRefund(paymentId: string, actor: AuthUser | null, input: RefundInput) {
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
      throw providerError('The payment provider could not process the refund');
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

  private async reserveRefund(paymentId: string, actor: AuthUser | null, amountCents: number, input: RefundInput): Promise<Reservation> {
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

      if (actor) await this.assertCanRefund(payment, actor); // null = trusted internal caller (order/booking cancellation)

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
          availableAt: (await tx.businessLedgerEntry.findFirst({ where: { paymentId, type: LEDGER_SALE }, select: { availableAt: true } }))?.availableAt ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor?.id ?? null,
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

  private async releaseRefund(paymentId: string, ledgerEntryId: string, actor: AuthUser | null, amountCents: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.businessLedgerEntry.update({ where: { id: ledgerEntryId }, data: { type: LEDGER_REFUND_FAILED } });
      await tx.auditLog.create({
        data: {
          actorUserId: actor?.id ?? null,
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
    actor: AuthUser | null,
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
      // Give back the commission that belongs to the refunded part (proportional, never more than still held).
      const commissionRows = await tx.businessLedgerEntry.findMany({
        where: { paymentId, type: { in: [LEDGER.COMMISSION, LEDGER.COMMISSION_REVERSAL] } },
      });
      const charged = commissionRows.find((e) => e.type === LEDGER.COMMISSION);
      if (charged && charged.rateBps) {
        const reversed = commissionRows.filter((e) => e.type === LEDGER.COMMISSION_REVERSAL).reduce((sum, e) => sum + e.amountCents, 0);
        const back = commissionReversalCents(amountCents, charged.rateBps, Math.abs(charged.amountCents), reversed);
        if (back > 0) {
          await tx.businessLedgerEntry.create({
            data: {
              businessId: charged.businessId,
              paymentId,
              orderId: charged.orderId,
              workshopBookingId: charged.workshopBookingId,
              type: LEDGER.COMMISSION_REVERSAL,
              amountCents: back,
              currency: charged.currency,
              rateBps: charged.rateBps,
              availableAt: charged.availableAt,
            },
          });
        }
      }

      const status = refundedCents >= toCents(payment.amount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

      await tx.payment.update({ where: { id: paymentId }, data: { status, refundedAt: new Date() } });
      if (payment.orderId) {
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: status } });
      }
      if (payment.customerOrderId) {
        const siblings = await tx.order.findMany({ where: { customerOrderId: payment.customerOrderId }, select: { paymentStatus: true } });
        const allRefunded = siblings.length > 0 && siblings.every((o) => o.paymentStatus === PaymentStatus.REFUNDED);
        await tx.customerOrder.update({
          where: { id: payment.customerOrderId },
          data: { paymentStatus: allRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actor?.id ?? null,
          action: 'PAYMENT_REFUNDED',
          targetType: 'PAYMENT',
          targetId: paymentId,
          metadata: { amountCents, refundedCents, providerRefundId, reason: reason ?? null, ledgerEntryId },
        },
      });

      return { paymentId, status, refundedCents, refundedAmount: refundedCents / 100, replayed: false };
    });
  }

  // ==========================================
  // INTERNAL REFUNDS (order / booking cancellation)
  // ==========================================

  /**
   * Refunds whatever is still refundable on a paid payment (used when the shop
   * cancels or rejects a paid order, or a payment arrives for something that
   * was already released). Never throws: the outcome is returned so the caller
   * can tell the user, and a failure is audited for an admin to retry.
   */
  async refundPaymentRemainder(paymentId: string, reason: string, maxCents?: number, idempotencyKey?: string): Promise<{ status: 'REFUNDED' | 'NOT_REQUIRED' | 'FAILED'; refundedCents: number }> {
    try {
      const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
      if (!payment || !REFUNDABLE_STATUSES.includes(payment.status)) return { status: 'NOT_REQUIRED', refundedCents: 0 };
      const entries = await this.prisma.businessLedgerEntry.findMany({
        where: { paymentId, type: { in: [LEDGER_REFUND, LEDGER_REFUND_PENDING] } },
      });
      const already = entries.reduce((sum, e) => sum + Math.abs(e.amountCents), 0);
      let cents = toCents(payment.amount) - already;
      if (maxCents !== undefined) cents = Math.min(cents, maxCents);
      if (cents <= 0) return { status: 'NOT_REQUIRED', refundedCents: 0 };
      const result = await this.processRefund(paymentId, null, {
        amount: cents / 100,
        reason,
        idempotencyKey: idempotencyKey ?? `auto-${paymentId}-${already}`,
      });
      return { status: 'REFUNDED', refundedCents: result.refundedCents };
    } catch (err) {
      this.logger.error(`Automatic refund failed for payment ${paymentId}`);
      await this.prisma.auditLog
        .create({ data: { action: 'PAYMENT_AUTO_REFUND_FAILED', targetType: 'PAYMENT', targetId: paymentId, metadata: { reason } } })
        .catch(() => undefined);
      return { status: 'FAILED', refundedCents: 0 };
    }
  }

  /** Refund of the store order (everything still refundable, delivery fee included; `maxCents` caps it for partial returns). */
  async refundOrder(orderId: string, reason: string, maxCents?: number, idempotencyKey?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, status: { in: REFUNDABLE_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) return { status: 'NOT_REQUIRED' as const, refundedCents: 0 };
    return this.refundPaymentRemainder(payment.id, reason, maxCents, idempotencyKey);
  }

  /** Refund (part of) a paid workshop booking. `amountCents` undefined = everything. */
  async refundWorkshopBooking(bookingId: string, reason: string, amountCents?: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { workshopBookingId: bookingId, status: { in: REFUNDABLE_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) return { status: 'NOT_REQUIRED' as const, refundedCents: 0 };
    return this.refundPaymentRemainder(payment.id, reason, amountCents);
  }
}
