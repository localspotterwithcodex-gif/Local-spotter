import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { availableBalanceCents } from './balance';
import { BALANCE_TYPES, LEDGER } from './ledger';

export interface BalanceSummary {
  currency: 'EUR';
  /** Gross sales (SALE entries) in cents. */
  grossSalesCents: number;
  /** Refunds (confirmed and in flight) in cents, positive. */
  refundsCents: number;
  /** Platform commission kept after refund reversals, in cents, positive. */
  commissionCents: number;
  /** gross - refunds - commission. */
  netSalesCents: number;
  /** Money that left the ledger in payouts (still counted while a payout is pending). */
  payoutsCents: number;
  paidOutCents: number;
  /** Created / approved but not yet paid. */
  pendingPayoutCents: number;
  /** Net sales that are still inside the hold period. */
  onHoldCents: number;
  /** Ready for the next weekly payout (never below 0). */
  availableCents: number;
  /** Day the hold period of the next sale ends, if any money is on hold. */
  nextReleaseAt: Date | null;
  recentEntries: {
    id: string;
    type: string;
    amountCents: number;
    createdAt: Date;
    availableAt: Date | null;
    orderNumber: string | null;
    workshopTitle: string | null;
  }[];
  payouts: { id: string; amountCents: number; status: string; requestedAt: Date; paidAt: Date | null; periodKey: string | null }[];
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Read-only balance for one business, derived from the ledger and payouts tables. */
  async getBalance(businessId: string, user: AuthUser): Promise<BalanceSummary> {
    await this.assertAccess(businessId, user);
    const now = new Date();

    const [sums, payouts, recent, available, nextHold] = await Promise.all([
      this.prisma.businessLedgerEntry.groupBy({
        by: ['type'],
        where: { businessId, type: { in: BALANCE_TYPES } },
        _sum: { amountCents: true },
      }),
      this.prisma.payout.findMany({ where: { businessId }, orderBy: { requestedAt: 'desc' }, take: 20 }),
      this.prisma.businessLedgerEntry.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { order: { select: { orderNumber: true } }, workshopBooking: { select: { workshop: { select: { title: true } } } } },
      }),
      availableBalanceCents(this.prisma, businessId, now),
      this.prisma.businessLedgerEntry.findFirst({
        where: { businessId, type: LEDGER.SALE, availableAt: { gt: now } },
        orderBy: { availableAt: 'asc' },
        select: { availableAt: true },
      }),
    ]);

    const byType = new Map(sums.map((s) => [s.type, s._sum.amountCents ?? 0]));
    const sum = (t: string) => byType.get(t) ?? 0;
    const grossSalesCents = sum(LEDGER.SALE);
    const refundsCents = Math.abs(sum(LEDGER.REFUND) + sum(LEDGER.REFUND_PENDING));
    const commissionCents = Math.abs(sum(LEDGER.COMMISSION)) - sum(LEDGER.COMMISSION_REVERSAL);
    const netSalesCents = grossSalesCents - refundsCents - commissionCents;
    const payoutsCents = Math.abs(sum(LEDGER.PAYOUT)) - sum(LEDGER.PAYOUT_REVERSAL);
    const totalBalance = netSalesCents - payoutsCents;

    const cents = (d: { toString(): string }) => Math.round(Number(d.toString()) * 100);
    const paidOutCents = payouts.filter((p) => p.status === 'PAID').reduce((n, p) => n + cents(p.amount), 0);
    const pendingPayoutCents = payouts.filter((p) => p.status === 'PENDING' || p.status === 'APPROVED').reduce((n, p) => n + cents(p.amount), 0);

    return {
      currency: 'EUR',
      grossSalesCents,
      refundsCents,
      commissionCents,
      netSalesCents,
      payoutsCents,
      paidOutCents,
      pendingPayoutCents,
      onHoldCents: Math.max(0, totalBalance - available),
      availableCents: Math.max(0, available),
      nextReleaseAt: nextHold?.availableAt ?? null,
      recentEntries: recent.map((e) => ({
        id: e.id,
        type: e.type,
        amountCents: e.amountCents,
        createdAt: e.createdAt,
        availableAt: e.availableAt,
        orderNumber: e.order?.orderNumber ?? null,
        workshopTitle: e.workshopBooking?.workshop?.title ?? null,
      })),
      payouts: payouts.map((p) => ({ id: p.id, amountCents: cents(p.amount), status: p.status, requestedAt: p.requestedAt, paidAt: p.paidAt, periodKey: p.periodKey })),
    };
  }

  private async assertAccess(businessId: string, user: AuthUser) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) throw new NotFoundException('Winkel niet gevonden');
    if (user.role === UserRole.SUPER_ADMIN) return;
    const owner = await this.prisma.businessOwnerProfile.findUnique({ where: { userId: user.id } });
    if (!owner || business.ownerProfileId !== owner.id) {
      throw new ForbiddenException('Je bent niet gemachtigd om de financiën van deze winkel te bekijken');
    }
  }
}
