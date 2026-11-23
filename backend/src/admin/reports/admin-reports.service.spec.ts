import { AdminReportsService } from './admin-reports.service';
import { amsterdamMonthRange, ledgerTotals, monthsBetween } from './report-math';

describe('report math', () => {
  it('uses Amsterdam month boundaries (CET in winter, CEST in summer)', () => {
    expect(amsterdamMonthRange('2026-01')).toEqual({ start: new Date('2025-12-31T23:00:00Z'), end: new Date('2026-01-31T23:00:00Z') });
    expect(amsterdamMonthRange('2026-07').start).toEqual(new Date('2026-06-30T22:00:00Z'));
    expect(amsterdamMonthRange('2026-10')).toEqual({ start: new Date('2026-09-30T22:00:00Z'), end: new Date('2026-10-31T23:00:00Z') });
    expect(amsterdamMonthRange('2026-12').end).toEqual(new Date('2026-12-31T23:00:00Z'));
    expect(() => amsterdamMonthRange('2026-13')).toThrow();
  });

  it('lists months and refuses reversed or too long ranges', () => {
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(() => monthsBetween('2027-01', '2026-12')).toThrow();
    expect(() => monthsBetween('2020-01', '2026-01')).toThrow('at most');
  });

  it('nets refunds, commission reversals and pending refunds like the shop balance does', () => {
    const t = ledgerTotals([
      { type: 'SALE', amountCents: 10000 },
      { type: 'COMMISSION', amountCents: -500 },
      { type: 'REFUND', amountCents: -2000 },
      { type: 'COMMISSION_REVERSAL', amountCents: 100 },
      { type: 'REFUND_PENDING', amountCents: -1000 },
      { type: 'REFUND_FAILED', amountCents: -700 }, // released reservation: ignored
      { type: 'PAYOUT', amountCents: -6000 }, // money movement, not revenue
    ]);
    expect(t).toEqual({ grossSalesCents: 10000, refundsCents: 3000, commissionCents: 400, netOwedCents: 6600 });
  });
});

/** Reconciliation (Phase 6 gate): platform totals = sum of the shops = what the ledger, payments and payouts say. */
describe('AdminReportsService reconciliation', () => {
  const inMonth = new Date('2026-11-15T12:00:00Z');
  const outside = new Date('2026-12-03T12:00:00Z');
  const ledger = [
    { businessId: 'a', type: 'SALE', amountCents: 12000, orderId: 'o1', workshopBookingId: null, createdAt: inMonth },
    { businessId: 'a', type: 'COMMISSION', amountCents: -600, orderId: 'o1', workshopBookingId: null, createdAt: inMonth },
    { businessId: 'a', type: 'SALE', amountCents: 3000, orderId: 'o2', workshopBookingId: null, createdAt: inMonth },
    { businessId: 'a', type: 'COMMISSION', amountCents: -150, orderId: 'o2', workshopBookingId: null, createdAt: inMonth },
    { businessId: 'a', type: 'REFUND', amountCents: -3000, orderId: 'o2', workshopBookingId: null, createdAt: inMonth },
    { businessId: 'a', type: 'COMMISSION_REVERSAL', amountCents: 150, orderId: 'o2', workshopBookingId: null, createdAt: inMonth },
    { businessId: 'b', type: 'SALE', amountCents: 5000, orderId: null, workshopBookingId: 'w1', createdAt: inMonth },
    { businessId: 'b', type: 'COMMISSION', amountCents: -500, orderId: null, workshopBookingId: 'w1', createdAt: inMonth },
    { businessId: 'b', type: 'PAYOUT', amountCents: -4500, orderId: null, workshopBookingId: null, createdAt: inMonth },
    { businessId: 'b', type: 'SALE', amountCents: 9999, orderId: 'o9', workshopBookingId: null, createdAt: outside },
  ];
  const within = (d: Date, w: any) => !w?.createdAt || (d >= w.createdAt.gte && d < w.createdAt.lt);
  const prisma = {
    businessLedgerEntry: {
      findMany: jest.fn(async ({ where }: any) =>
        ledger.filter((r) => within(r.createdAt, where) && (!where.businessId || (where.businessId.in ?? [where.businessId]).includes(r.businessId))),
      ),
    },
    payment: { aggregate: jest.fn(async () => ({ _sum: { amount: 57 }, _count: 1 })) },
    payout: {
      aggregate: jest.fn(async ({ where }: any) => (where.status ? { _sum: { amount: null }, _count: 0 } : { _sum: { amount: 45 }, _count: 1 })),
      findMany: jest.fn(async () => [{ businessId: 'b', status: 'PENDING', amount: 45 }]),
    },
    business: {
      count: jest.fn(async () => 2),
      findMany: jest.fn(async () => [
        { id: 'a', name: 'A', status: 'ACTIVE', subscription: { status: 'ACTIVE', plan: { slug: 'WEBSHOP', commissionBps: 500 } } },
        { id: 'b', name: 'B', status: 'ACTIVE', subscription: { status: 'ACTIVE', plan: { slug: 'WORKSHOP', commissionBps: null } } },
      ]),
      findUnique: jest.fn(async () => ({ id: 'a', name: 'A' })),
    },
    auditLog: { create: jest.fn() },
  };
  const service = new AdminReportsService(prisma as never, { get: () => '1000' } as never);

  it('platform totals equal the sum over shops and the ledger, and only count the month', async () => {
    const m = await service.monthly('2026-11');
    const shops = await service.businesses({ month: '2026-11' });
    for (const k of ['grossSalesCents', 'refundsCents', 'commissionCents', 'netOwedCents'] as const) {
      expect(m[k]).toBe(shops.items.reduce((t, i) => t + i[k], 0));
    }
    expect(m).toMatchObject({ orders: 2, workshopBookings: 1, grossSalesCents: 20000, refundsCents: 3000, commissionCents: 1100, netOwedCents: 15900 });
    expect(m).toMatchObject({ subscriptionRevenueCents: 5700, payoutsCreated: { count: 1, cents: 4500 }, netPlatformRevenueCents: 6800 });
    expect(shops.items.map((i) => i.commissionRateBps)).toEqual([500, 1000]); // plan rate, else the platform default
    expect(shops.items[1]).toMatchObject({ payoutStatus: 'PENDING', payoutCents: 4500, orders: 0 });
  });

  it('the shop series matches the shop row, and CSV keeps negative numbers numeric and is audited', async () => {
    const s = await service.business('a', '2026-11', '2026-12');
    expect(s.months[0]).toMatchObject({ month: '2026-11', grossSalesCents: 15000, netOwedCents: 11400 });
    const csv = await service.toCsv('business', { ...s, months: [{ ...s.months[0], netOwedCents: -50 }] }, 'admin-1');
    expect(csv.split('\n')[1]).toBe('"a","2026-11",2,15000,3000,600,-50');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ADMIN_EXPORT_REPORT', targetId: 'a' }) });
  });
});
