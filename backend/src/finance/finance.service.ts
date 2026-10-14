import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';

const SALE = 'SALE';
const REFUND = 'REFUND';

export interface BalanceSummary {
  currency: 'EUR';
  /** Gross sales (SALE ledger entries) in cents. */
  grossSalesCents: number;
  /** Confirmed refunds in cents (positive number). */
  refundsCents: number;
  /** gross - refunds. Platform commission is not deducted yet (rules pending, decision D-006). */
  netSalesCents: number;
  paidOutCents: number;
  /** Requested or approved but not yet paid. */
  pendingPayoutCents: number;
  /** net - paid out - pending payouts, never below 0. */
  availableCents: number;
  recentEntries: {
    id: string;
    type: string;
    amountCents: number;
    createdAt: Date;
    orderNumber: string | null;
    workshopTitle: string | null;
  }[];
  payouts: { id: string; amountCents: number; status: string; requestedAt: Date; paidAt: Date | null }[];
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Read-only balance for one business, derived from the ledger and payouts tables. */
  async getBalance(businessId: string, user: AuthUser): Promise<BalanceSummary> {
    await this.assertAccess(businessId, user);

    const [sums, payouts, recent] = await Promise.all([
      this.prisma.businessLedgerEntry.groupBy({
        by: ['type'],
        where: { businessId },
        _sum: { amountCents: true },
      }),
      this.prisma.payout.findMany({
        where: { businessId },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      }),
      this.prisma.businessLedgerEntry.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { order: { select: { orderNumber: true } }, workshopBooking: { select: { workshop: { select: { title: true } } } } },
      }),
    ]);

    const byType = new Map(sums.map((s) => [s.type, s._sum.amountCents ?? 0]));
    const grossSalesCents = byType.get(SALE) ?? 0;
    // Refund entries are stored negative; expose them as a positive amount.
    const refundsCents = Math.abs(byType.get(REFUND) ?? 0);
    const netSalesCents = grossSalesCents - refundsCents;

    const cents = (d: { toString(): string }) => Math.round(Number(d.toString()) * 100);
    const paidOutCents = payouts.filter((p) => p.status === 'PAID').reduce((n, p) => n + cents(p.amount), 0);
    const pendingPayoutCents = payouts.filter((p) => p.status === 'PENDING' || p.status === 'APPROVED').reduce((n, p) => n + cents(p.amount), 0);

    return {
      currency: 'EUR',
      grossSalesCents,
      refundsCents,
      netSalesCents,
      paidOutCents,
      pendingPayoutCents,
      availableCents: Math.max(0, netSalesCents - paidOutCents - pendingPayoutCents),
      recentEntries: recent.map((e) => ({
        id: e.id,
        type: e.type,
        amountCents: e.amountCents,
        createdAt: e.createdAt,
        orderNumber: e.order?.orderNumber ?? null,
        workshopTitle: e.workshopBooking?.workshop?.title ?? null,
      })),
      payouts: payouts.map((p) => ({ id: p.id, amountCents: cents(p.amount), status: p.status, requestedAt: p.requestedAt, paidAt: p.paidAt })),
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
