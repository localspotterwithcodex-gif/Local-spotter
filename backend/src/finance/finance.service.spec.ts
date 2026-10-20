import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FinanceService } from './finance.service';

const owner = { id: 'u1', role: UserRole.BUSINESS_OWNER } as any;
const admin = { id: 'a1', role: UserRole.SUPER_ADMIN } as any;

function make(overrides: any = {}) {
  const prisma: any = {
    business: { findUnique: jest.fn().mockResolvedValue({ id: 'b1', ownerProfileId: 'p1', deletedAt: null }) },
    businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
    businessLedgerEntry: {
      groupBy: jest.fn().mockResolvedValue([
        { type: 'SALE', _sum: { amountCents: 50000 } },
        { type: 'COMMISSION', _sum: { amountCents: -2500 } },
        { type: 'COMMISSION_REVERSAL', _sum: { amountCents: 250 } },
        { type: 'REFUND', _sum: { amountCents: -4000 } },
        { type: 'REFUND_PENDING', _sum: { amountCents: -1000 } },
        { type: 'PAYOUT', _sum: { amountCents: -10000 } },
      ]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amountCents: 20000 } }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ availableAt: new Date('2026-12-01') }),
    },
    payout: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p-1', amount: '100.00', status: 'PAID', requestedAt: new Date(), paidAt: new Date(), periodKey: '2026-W40' },
        { id: 'p-2', amount: '50.50', status: 'PENDING', requestedAt: new Date(), paidAt: null, periodKey: '2026-W41' },
        { id: 'p-3', amount: '999', status: 'REJECTED', requestedAt: new Date(), paidAt: null, periodKey: null },
      ]),
    },
    ...overrides,
  };
  return { svc: new FinanceService(prisma), prisma };
}

describe('FinanceService.getBalance', () => {
  it('derives gross, refunds, commission, net, on-hold and available from the ledger', async () => {
    const { svc } = make();
    const out = await svc.getBalance('b1', owner);
    expect(out.grossSalesCents).toBe(50000);
    expect(out.refundsCents).toBe(5000);
    expect(out.commissionCents).toBe(2250); // charged 2500, 250 reversed
    expect(out.netSalesCents).toBe(50000 - 5000 - 2250);
    expect(out.payoutsCents).toBe(10000);
    // total balance = 42750 - 10000; 20000 of it is released, the rest is still on hold
    expect(out.availableCents).toBe(20000);
    expect(out.onHoldCents).toBe(32750 - 20000);
    expect(out.nextReleaseAt).toEqual(new Date('2026-12-01'));
    expect(out.paidOutCents).toBe(10000);
    expect(out.pendingPayoutCents).toBe(5050); // rejected payouts are ignored
  });

  it('only counts released entries as available', async () => {
    const { svc, prisma } = make();
    await svc.getBalance('b1', owner);
    const where = prisma.businessLedgerEntry.aggregate.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ availableAt: null }, { availableAt: { lte: expect.any(Date) } }]);
  });

  it('never reports a negative available balance or negative on-hold', async () => {
    const { svc, prisma } = make();
    prisma.businessLedgerEntry.aggregate.mockResolvedValue({ _sum: { amountCents: -700 } });
    const out = await svc.getBalance('b1', owner);
    expect(out.availableCents).toBe(0);
    expect(out.onHoldCents).toBeGreaterThanOrEqual(0);
  });

  it('refuses another owner and unknown businesses, allows admins', async () => {
    const other = make({ businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'someone-else' }) } });
    await expect(other.svc.getBalance('b1', owner)).rejects.toThrow(ForbiddenException);
    const missing = make({ business: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(missing.svc.getBalance('b1', owner)).rejects.toThrow(NotFoundException);
    await expect(make().svc.getBalance('b1', admin)).resolves.toBeDefined();
  });
});
