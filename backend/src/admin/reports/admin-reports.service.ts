import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessStatus, PaymentPurpose, PaymentStatus, PayoutStatus, Prisma, SubscriptionPlanSlug } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { csvCell } from '../../finance/payouts.service';
import { LEDGER } from '../../finance/ledger';
import { amsterdamMonthRange, ledgerTotals, monthsBetween, toCents } from './report-math';

const PAGE_SIZE = 50;

function range(month: string) {
  try {
    return amsterdamMonthRange(month);
  } catch (e) {
    throw new BadRequestException((e as Error).message);
  }
}

/** Super-admin finance reports (MASTER-PROMPT Phase 6). Money in integer cents, EUR, Amsterdam months. */
@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private defaultBps(): number {
    const raw = Number(this.config.get<string>('COMMISSION_DEFAULT_BPS'));
    return Number.isInteger(raw) && raw > 0 ? raw : 0;
  }

  // shortcut: loads the month's ledger rows into memory; switch to SQL GROUP BY when a month has 100k+ entries.
  private ledgerRows(where: Prisma.BusinessLedgerEntryWhereInput) {
    return this.prisma.businessLedgerEntry.findMany({
      where,
      select: { businessId: true, type: true, amountCents: true, orderId: true, workshopBookingId: true, createdAt: true },
    });
  }

  /** 1. Platform totals for one month. */
  async monthly(month: string) {
    const { start, end } = range(month);
    const rows = await this.ledgerRows({ createdAt: { gte: start, lt: end } });
    const sales = rows.filter((r) => r.type === LEDGER.SALE);
    const [subs, created, paid] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { purpose: PaymentPurpose.BUSINESS_SUBSCRIPTION, status: PaymentStatus.PAID, paidAt: { gte: start, lt: end } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.aggregate({ where: { createdAt: { gte: start, lt: end } }, _sum: { amount: true }, _count: true }),
      this.prisma.payout.aggregate({ where: { status: PayoutStatus.PAID, paidAt: { gte: start, lt: end } }, _sum: { amount: true }, _count: true }),
    ]);
    const totals = ledgerTotals(rows);
    const subscriptionRevenueCents = toCents(subs._sum.amount);
    return {
      month,
      currency: 'EUR',
      orders: new Set(sales.filter((r) => r.orderId).map((r) => r.orderId)).size,
      workshopBookings: new Set(sales.filter((r) => r.workshopBookingId).map((r) => r.workshopBookingId)).size,
      ...totals,
      subscriptionPayments: subs._count,
      subscriptionRevenueCents,
      payoutsCreated: { count: created._count, cents: toCents(created._sum.amount) },
      payoutsPaid: { count: paid._count, cents: toCents(paid._sum.amount) },
      netPlatformRevenueCents: totals.commissionCents + subscriptionRevenueCents,
    };
  }

  /** 2. Per shop for one month, filtered by plan and shop status, 50 per page. */
  async businesses(q: { month: string; plan?: SubscriptionPlanSlug; status?: BusinessStatus; page?: number }) {
    const { start, end } = range(q.month);
    const page = Math.max(1, Math.floor(q.page ?? 1));
    const where: Prisma.BusinessWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.plan ? { subscription: { plan: { slug: q.plan } } } : {}),
    };
    const [total, shops] = await Promise.all([
      this.prisma.business.count({ where }),
      this.prisma.business.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          status: true,
          subscription: { select: { status: true, currentPeriodEnd: true, plan: { select: { slug: true, commissionBps: true } } } },
        },
      }),
    ]);
    const ids = shops.map((s) => s.id);
    const [rows, payouts] = await Promise.all([
      this.ledgerRows({ businessId: { in: ids }, createdAt: { gte: start, lt: end } }),
      this.prisma.payout.findMany({
        where: { businessId: { in: ids }, createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: 'desc' },
        select: { businessId: true, status: true, amount: true },
      }),
    ]);
    const defaultBps = this.defaultBps();
    return {
      month: q.month,
      currency: 'EUR',
      page,
      pageSize: PAGE_SIZE,
      total,
      items: shops.map((s) => {
        const mine = rows.filter((r) => r.businessId === s.id);
        const payout = payouts.find((p) => p.businessId === s.id);
        return {
          businessId: s.id,
          name: s.name,
          status: s.status,
          plan: s.subscription?.plan.slug ?? null,
          subscriptionStatus: s.subscription?.status ?? null,
          commissionRateBps: s.subscription?.plan.commissionBps ?? defaultBps,
          orders: new Set(mine.filter((r) => r.type === LEDGER.SALE && r.orderId).map((r) => r.orderId)).size,
          ...ledgerTotals(mine),
          payoutStatus: payout?.status ?? null,
          payoutCents: payout ? toCents(payout.amount) : 0,
        };
      }),
    };
  }

  /** 3. One shop, month by month, with the ledger entries behind the numbers. */
  async business(businessId: string, from: string, to: string) {
    let months: string[];
    try {
      months = monthsBetween(from, to);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const shop = await this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true, name: true } });
    if (!shop) throw new NotFoundException('Business not found');
    const ranges = months.map((m) => ({ month: m, ...amsterdamMonthRange(m) }));
    const rows = await this.ledgerRows({ businessId, createdAt: { gte: ranges[0].start, lt: ranges[ranges.length - 1].end } });
    const entries = await this.prisma.businessLedgerEntry.findMany({
      where: { businessId, createdAt: { gte: ranges[0].start, lt: ranges[ranges.length - 1].end } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: { id: true, type: true, amountCents: true, rateBps: true, orderId: true, workshopBookingId: true, payoutId: true, createdAt: true },
    });
    return {
      business: shop,
      currency: 'EUR',
      months: ranges.map((r) => {
        const inMonth = rows.filter((x) => x.createdAt >= r.start && x.createdAt < r.end);
        return { month: r.month, orders: new Set(inMonth.filter((x) => x.type === LEDGER.SALE && x.orderId).map((x) => x.orderId)).size, ...ledgerTotals(inMonth) };
      }),
      entries,
    };
  }

  /** CSV of any report above (no IBAN or card data), audited. */
  async toCsv(kind: 'monthly' | 'businesses' | 'business', data: Record<string, any>, adminId: string): Promise<string> {
    const lines: (string | number)[][] = [];
    if (kind === 'monthly') {
      lines.push(['month', 'orders', 'workshop_bookings', 'gross_sales_cents', 'refunds_cents', 'commission_cents', 'subscription_revenue_cents', 'payouts_created_cents', 'payouts_paid_cents', 'net_platform_revenue_cents']);
      lines.push([data.month, data.orders, data.workshopBookings, data.grossSalesCents, data.refundsCents, data.commissionCents, data.subscriptionRevenueCents, data.payoutsCreated.cents, data.payoutsPaid.cents, data.netPlatformRevenueCents]);
    } else if (kind === 'businesses') {
      lines.push(['month', 'business_id', 'name', 'plan', 'orders', 'gross_sales_cents', 'refunds_cents', 'commission_rate_bps', 'commission_cents', 'net_owed_cents', 'subscription_status', 'payout_status']);
      for (const i of data.items) lines.push([data.month, i.businessId, i.name, i.plan ?? '', i.orders, i.grossSalesCents, i.refundsCents, i.commissionRateBps, i.commissionCents, i.netOwedCents, i.subscriptionStatus ?? '', i.payoutStatus ?? '']);
    } else {
      lines.push(['business_id', 'month', 'orders', 'gross_sales_cents', 'refunds_cents', 'commission_cents', 'net_owed_cents']);
      for (const m of data.months) lines.push([data.business.id, m.month, m.orders, m.grossSalesCents, m.refundsCents, m.commissionCents, m.netOwedCents]);
    }
    await this.prisma.auditLog.create({
      data: { actorUserId: adminId, action: 'ADMIN_EXPORT_REPORT', targetType: 'REPORT', targetId: data.business?.id ?? null, metadata: { kind, month: data.month ?? null, rows: lines.length - 1 } },
    });
    // Numbers go out bare (a negative amount must stay a number); text is quoted and formula-guarded.
    return lines.map((l) => l.map((v) => (typeof v === 'number' ? String(v) : csvCell(v))).join(',')).join('\n') + '\n';
  }
}
