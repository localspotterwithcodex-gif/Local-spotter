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
        { type: 'REFUND', _sum: { amountCents: -5000 } },
      ]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    payout: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p-1', amount: '100.00', status: 'PAID', requestedAt: new Date(), paidAt: new Date() },
        { id: 'p-2', amount: '50.50', status: 'PENDING', requestedAt: new Date(), paidAt: null },
        { id: 'p-3', amount: '999', status: 'REJECTED', requestedAt: new Date(), paidAt: null },
      ]),
    },
    ...overrides,
  };
  return { svc: new FinanceService(prisma), prisma };
}

describe('FinanceService.getBalance', () => {
  it('derives gross, refunds, net, paid-out, pending and available from the ledger and payouts', async () => {
    const { svc } = make();
    const out = await svc.getBalance('b1', owner);
    expect(out.grossSalesCents).toBe(50000);
    expect(out.refundsCents).toBe(5000);
    expect(out.netSalesCents).toBe(45000);
    expect(out.paidOutCents).toBe(10000);
    expect(out.pendingPayoutCents).toBe(5050);
    expect(out.availableCents).toBe(45000 - 10000 - 5050); // rejected payout ignored
  });

  it('never reports a negative available balance', async () => {
    const { svc, prisma } = make();
    prisma.businessLedgerEntry.groupBy.mockResolvedValue([{ type: 'SALE', _sum: { amountCents: 100 } }]);
    expect((await svc.getBalance('b1', owner)).availableCents).toBe(0);
  });

  it('refuses another owner and unknown businesses, allows admins', async () => {
    const other = make({ businessOwnerProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'someone-else' }) } });
    await expect(other.svc.getBalance('b1', owner)).rejects.toThrow(ForbiddenException);
    const missing = make({ business: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(missing.svc.getBalance('b1', owner)).rejects.toThrow(NotFoundException);
    await expect(make().svc.getBalance('b1', admin)).resolves.toBeDefined();
  });
});
