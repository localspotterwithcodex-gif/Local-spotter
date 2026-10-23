import { BadRequestException } from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service';

const NOW = new Date('2026-10-23T10:00:00.000Z');

function make() {
  // $queryRaw is called as: salesTotals(cur), salesTotals(prev), dailySales, salesByCategory, salesByShop(cur), salesByShop(prev)
  const prisma: any = {
    user: {
      count: jest.fn().mockResolvedValueOnce(100).mockResolvedValueOnce(10).mockResolvedValueOnce(5),
      groupBy: jest.fn().mockResolvedValue([
        { role: 'CONSUMER', _count: { _all: 75 } },
        { role: 'BUSINESS_OWNER', _count: { _all: 24 } },
        { role: 'SUPER_ADMIN', _count: { _all: 1 } },
      ]),
    },
    business: {
      count: jest.fn().mockImplementation(async ({ where }: any) => (where.status === 'ACTIVE' ? (where.createdAt ? 3 : 12) : 4)),
      findMany: jest
        .fn()
        .mockImplementation(async (args: any) =>
          args.distinct ? [{ state: 'Noord-Holland' }, { state: 'Tamilnadu' }] : [{ createdAt: new Date('2026-10-22T08:00:00Z') }, { createdAt: new Date('2026-10-22T09:00:00Z') }],
        ),
    },
    order: { count: jest.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(10) },
    $queryRaw: jest.fn(),
  };
  prisma.$queryRaw
    .mockResolvedValueOnce([{ revenue: 1000, orders: 10 }]) // current totals
    .mockResolvedValueOnce([{ revenue: 500, orders: 5 }]) // previous totals
    .mockResolvedValueOnce([{ day: '2026-10-22', revenue: 600, orders: 6 }]) // trend
    .mockResolvedValueOnce([
      { name: 'Home & Living', revenue: 700 },
      { name: 'Fashion', revenue: 200 },
      { name: 'A', revenue: 50 },
      { name: 'B', revenue: 30 },
      { name: 'C', revenue: 15 },
      { name: 'D', revenue: 5 },
    ]) // by category
    .mockResolvedValueOnce([
      { id: 's1', name: 'Codexk7', logoUrl: null, revenue: 800, orders: 8 },
      { id: 's2', name: 'Nordic', logoUrl: 'https://img/n.webp', revenue: 200, orders: 2 },
    ]) // top shops current
    .mockResolvedValueOnce([{ id: 's1', name: 'Codexk7', logoUrl: null, revenue: 400, orders: 4 }]); // previous
  return { svc: new AdminAnalyticsService(prisma), prisma };
}

describe('AdminAnalyticsService', () => {
  it('computes KPIs and period-over-period changes from the database numbers', async () => {
    const { svc } = make();
    const r = await svc.getAnalytics({}, NOW);
    expect(r.period.days).toBe(30);
    expect(r.kpis.totalUsers).toEqual({ value: 100, deltaPct: 100 }); // 10 new vs 5 new
    expect(r.kpis.totalOrders).toEqual({ value: 10, deltaPct: 100 });
    expect(r.kpis.grossRevenue).toEqual({ value: 1000, deltaPct: 100 });
    expect(r.kpis.averageOrderValue).toEqual({ value: 100, deltaPct: 0 }); // 100 vs 100
    expect(r.kpis.conversionRate).toEqual({ value: 50, deltaPct: 0 }); // 10/20 vs 5/10
    expect(r.regions).toEqual(['Noord-Holland', 'Tamilnadu']);
  });

  it('zero-fills the daily trend and keeps one point per day', async () => {
    const { svc } = make();
    const r = await svc.getAnalytics({ days: '30' }, NOW);
    expect(r.trend).toHaveLength(30);
    expect(r.trend[0].date).toBe('2026-09-24');
    expect(r.trend.at(-1)).toEqual({ date: '2026-10-23', revenue: 0, orders: 0 });
    expect(r.trend.find((p) => p.date === '2026-10-22')).toEqual({ date: '2026-10-22', revenue: 600, orders: 6 });
  });

  it('folds small categories into Other and shares add up to 100%', async () => {
    const { svc } = make();
    const r = await svc.getAnalytics({}, NOW);
    expect(r.revenueByCategory.map((c) => c.name)).toEqual(['Home & Living', 'Fashion', 'A', 'B', 'Other']);
    expect(r.revenueByCategory.at(-1)).toMatchObject({ revenue: 20 });
    expect(r.revenueByCategory.reduce((s, c) => s + c.share, 0)).toBeCloseTo(100, 0);
  });

  it('ranks top shops with growth versus the previous period (null when it had no sales)', async () => {
    const { svc } = make();
    const r = await svc.getAnalytics({}, NOW);
    expect(r.topShops[0]).toMatchObject({ id: 's1', revenue: 800, orders: 8, growthPct: 100 });
    expect(r.topShops[1]).toMatchObject({ id: 's2', growthPct: null });
  });

  it('builds shop growth buckets and the role distribution', async () => {
    const { svc } = make();
    const r = await svc.getAnalytics({}, NOW);
    expect(r.shopGrowth).toHaveLength(30);
    expect(r.shopGrowth.find((p) => p.date === '2026-10-22')?.newShops).toBe(2);
    expect(r.shopGrowth.at(-1)?.activeShops).toBe(3 + 2); // active before the period + 2 created earlier in it
    expect(r.userDistribution[0]).toEqual({ role: 'CONSUMER', count: 75, share: 75 });
  });

  it('uses weekly buckets for 90 days', async () => {
    const { svc } = make();
    const r = await svc.getAnalytics({ days: '90' }, NOW);
    expect(r.trend).toHaveLength(90);
    expect(r.shopGrowth).toHaveLength(Math.ceil(90 / 7));
  });

  it('validates the period, the region and the category id', async () => {
    const { svc } = make();
    await expect(svc.getAnalytics({ days: '45' }, NOW)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.getAnalytics({ categoryId: "1'; DROP TABLE users;--" }, NOW)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.getAnalytics({ region: 'x'.repeat(101) }, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });
});
