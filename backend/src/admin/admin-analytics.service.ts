import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const ANALYTICS_PERIODS = [7, 30, 90] as const;
const DAY_MS = 86_400_000;
const SALE_PURPOSES = ['PRODUCT_ORDER', 'WORKSHOP_BOOKING'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AnalyticsQuery {
  days?: string;
  region?: string;
  categoryId?: string;
}

interface Kpi {
  value: number;
  /** Change versus the previous period of the same length, in %; null when the previous period had nothing to compare. */
  deltaPct: number | null;
}

export interface AnalyticsResult {
  period: { days: number; from: string; to: string };
  regions: string[];
  kpis: {
    totalUsers: Kpi;
    activeShops: Kpi;
    totalOrders: Kpi;
    grossRevenue: Kpi;
    /** Paid orders ÷ orders started (checkouts), in %. deltaPct here is in percentage points. */
    conversionRate: Kpi;
    averageOrderValue: Kpi;
  };
  trend: { date: string; revenue: number; orders: number }[];
  revenueByCategory: { name: string; revenue: number; share: number }[];
  shopGrowth: { date: string; newShops: number; activeShops: number }[];
  userDistribution: { role: UserRole; count: number; share: number }[];
  topShops: { id: string; name: string; logoUrl: string | null; orders: number; revenue: number; growthPct: number | null }[];
}

const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;
const pctChange = (cur: number, prev: number): number | null => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);

/** Read-only platform analytics for the super-admin overview. All numbers come from the database. */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(query: AnalyticsQuery, now: Date = new Date()): Promise<AnalyticsResult> {
    const days = query.days === undefined ? 30 : Number(query.days);
    if (!(ANALYTICS_PERIODS as readonly number[]).includes(days)) {
      throw new BadRequestException(`days must be one of ${ANALYTICS_PERIODS.join(', ')}`);
    }
    const region = query.region?.trim() || undefined;
    if (region && region.length > 100) throw new BadRequestException('Invalid region');
    const categoryId = query.categoryId?.trim() || undefined;
    if (categoryId && !UUID_RE.test(categoryId)) throw new BadRequestException('Invalid categoryId');

    // Periods are whole UTC days, the last one ending now.
    const to = now;
    const from = new Date(startOfUtcDay(now).getTime() - (days - 1) * DAY_MS);
    const prevFrom = new Date(from.getTime() - days * DAY_MS);

    const bizFilter: Prisma.BusinessWhereInput = { deletedAt: null, ...(region ? { state: region } : {}), ...(categoryId ? { categoryId } : {}) };

    const [cur, prev, totalUsers, newUsersCur, newUsersPrev, activeShops, newShopsCur, newShopsPrev, startedCur, startedPrev, regionRows] = await Promise.all([
      this.salesTotals(from, to, region, categoryId),
      this.salesTotals(prevFrom, from, region, categoryId),
      this.prisma.user.count({ where: { isGuest: false, status: { not: 'DELETED' } } }),
      this.prisma.user.count({ where: { isGuest: false, createdAt: { gte: from, lte: to } } }),
      this.prisma.user.count({ where: { isGuest: false, createdAt: { gte: prevFrom, lt: from } } }),
      this.prisma.business.count({ where: { ...bizFilter, status: 'ACTIVE' } }),
      this.prisma.business.count({ where: { ...bizFilter, createdAt: { gte: from, lte: to } } }),
      this.prisma.business.count({ where: { ...bizFilter, createdAt: { gte: prevFrom, lt: from } } }),
      this.prisma.order.count({ where: { createdAt: { gte: from, lte: to }, business: bizFilter } }),
      this.prisma.order.count({ where: { createdAt: { gte: prevFrom, lt: from }, business: bizFilter } }),
      this.prisma.business.findMany({ where: { deletedAt: null, state: { not: '' } }, distinct: ['state'], select: { state: true }, orderBy: { state: 'asc' } }),
    ]);

    const conv = (paid: number, started: number) => (started > 0 ? Math.round((Math.min(paid, started) / started) * 1000) / 10 : 0);
    const convCur = conv(cur.orders, startedCur);
    const convPrev = conv(prev.orders, startedPrev);
    const aov = (t: { orders: number; revenue: number }) => (t.orders > 0 ? round2(t.revenue / t.orders) : 0);

    const [trendRows, categoryRows, shopsCur, shopsPrev, shopRows, baseActive, roleRows] = await Promise.all([
      this.dailySales(from, to, region, categoryId),
      this.salesByCategory(from, to, region, categoryId),
      this.salesByShop(from, to, region, categoryId),
      this.salesByShop(prevFrom, from, region, categoryId),
      this.prisma.business.findMany({ where: { ...bizFilter, createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      this.prisma.business.count({ where: { ...bizFilter, status: 'ACTIVE', createdAt: { lt: from } } }),
      this.prisma.user.groupBy({ by: ['role'], where: { isGuest: false, status: { not: 'DELETED' } }, _count: { _all: true } }),
    ]);

    // Trend: one point per day, zero-filled.
    const byDay = new Map(trendRows.map((r) => [r.day, r]));
    const trend = Array.from({ length: days }, (_, i) => {
      const date = isoDay(new Date(from.getTime() + i * DAY_MS));
      const row = byDay.get(date);
      return { date, revenue: round2(row?.revenue ?? 0), orders: row?.orders ?? 0 };
    });

    // Revenue by category: top 4 + "Other".
    const catTotal = categoryRows.reduce((s, r) => s + r.revenue, 0);
    const head = categoryRows.slice(0, 4);
    const rest = categoryRows.slice(4).reduce((s, r) => s + r.revenue, 0);
    const revenueByCategory = [...head, ...(rest > 0 ? [{ name: 'Other', revenue: rest }] : [])].map((r) => ({
      name: r.name,
      revenue: round2(r.revenue),
      share: catTotal > 0 ? Math.round((r.revenue / catTotal) * 1000) / 10 : 0,
    }));

    // Shop growth: daily buckets up to 30 days, weekly beyond. "Active" = shops that existed before the bucket and are active today.
    const bucketDays = days > 30 ? 7 : 1;
    const bucketCount = Math.ceil(days / bucketDays);
    const created = shopRows.map((r) => r.createdAt.getTime());
    let cumulativeNew = 0;
    const shopGrowth = Array.from({ length: bucketCount }, (_, i) => {
      const start = from.getTime() + i * bucketDays * DAY_MS;
      const end = start + bucketDays * DAY_MS;
      const newShops = created.filter((t) => t >= start && t < end).length;
      const point = { date: isoDay(new Date(start)), newShops, activeShops: baseActive + cumulativeNew };
      cumulativeNew += newShops;
      return point;
    });

    const roleTotal = roleRows.reduce((s, r) => s + r._count._all, 0);
    const userDistribution = roleRows
      .map((r) => ({ role: r.role, count: r._count._all, share: roleTotal > 0 ? Math.round((r._count._all / roleTotal) * 1000) / 10 : 0 }))
      .sort((a, b) => b.count - a.count);

    const prevRevenue = new Map(shopsPrev.map((s) => [s.id, s.revenue]));
    const topShops = shopsCur.slice(0, 5).map((s) => ({
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl,
      orders: s.orders,
      revenue: round2(s.revenue),
      growthPct: pctChange(s.revenue, prevRevenue.get(s.id) ?? 0),
    }));

    return {
      period: { days, from: from.toISOString(), to: to.toISOString() },
      regions: regionRows.map((r) => r.state).filter((s): s is string => !!s),
      kpis: {
        totalUsers: { value: totalUsers, deltaPct: pctChange(newUsersCur, newUsersPrev) },
        activeShops: { value: activeShops, deltaPct: pctChange(newShopsCur, newShopsPrev) },
        totalOrders: { value: cur.orders, deltaPct: pctChange(cur.orders, prev.orders) },
        grossRevenue: { value: round2(cur.revenue), deltaPct: pctChange(cur.revenue, prev.revenue) },
        conversionRate: { value: convCur, deltaPct: Math.round((convCur - convPrev) * 10) / 10 },
        averageOrderValue: { value: aov(cur), deltaPct: pctChange(aov(cur), aov(prev)) },
      },
      trend,
      revenueByCategory,
      shopGrowth,
      userDistribution,
      topShops,
    };
  }

  // ---- SQL helpers (paid sales only; filters applied through the shop the payment belongs to) ----

  private filters(region?: string, categoryId?: string) {
    return Prisma.sql`${region ? Prisma.sql`AND b.state = ${region}` : Prisma.empty} ${categoryId ? Prisma.sql`AND b.category_id = ${categoryId}::uuid` : Prisma.empty}`;
  }

  private async salesTotals(from: Date, to: Date, region?: string, categoryId?: string) {
    const rows = await this.prisma.$queryRaw<{ revenue: number | null; orders: number }[]>(Prisma.sql`
      SELECT COALESCE(SUM(p.amount), 0)::float8 AS revenue, COUNT(*)::int AS orders
      FROM payments p LEFT JOIN businesses b ON b.id = p.business_id
      WHERE p.status = 'PAID' AND p.purpose::text IN (${Prisma.join(SALE_PURPOSES)})
        AND p.paid_at >= ${from} AND p.paid_at < ${to} ${this.filters(region, categoryId)}`);
    return { revenue: Number(rows[0]?.revenue ?? 0), orders: Number(rows[0]?.orders ?? 0) };
  }

  private async dailySales(from: Date, to: Date, region?: string, categoryId?: string) {
    return this.prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc('day', p.paid_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
             COALESCE(SUM(p.amount), 0)::float8 AS revenue, COUNT(*)::int AS orders
      FROM payments p LEFT JOIN businesses b ON b.id = p.business_id
      WHERE p.status = 'PAID' AND p.purpose::text IN (${Prisma.join(SALE_PURPOSES)})
        AND p.paid_at >= ${from} AND p.paid_at < ${to} ${this.filters(region, categoryId)}
      GROUP BY 1 ORDER BY 1`);
  }

  private async salesByCategory(from: Date, to: Date, region?: string, categoryId?: string) {
    return this.prisma.$queryRaw<{ name: string; revenue: number }[]>(Prisma.sql`
      SELECT COALESCE(c.name, 'Other') AS name, COALESCE(SUM(p.amount), 0)::float8 AS revenue
      FROM payments p LEFT JOIN businesses b ON b.id = p.business_id LEFT JOIN business_categories c ON c.id = b.category_id
      WHERE p.status = 'PAID' AND p.purpose::text IN (${Prisma.join(SALE_PURPOSES)})
        AND p.paid_at >= ${from} AND p.paid_at < ${to} ${this.filters(region, categoryId)}
      GROUP BY 1 ORDER BY 2 DESC`);
  }

  private async salesByShop(from: Date, to: Date, region?: string, categoryId?: string) {
    const rows = await this.prisma.$queryRaw<{ id: string; name: string; logo_url: string | null; revenue: number; orders: number }[]>(Prisma.sql`
      SELECT b.id, b.name, m.url AS logo_url, COALESCE(SUM(p.amount), 0)::float8 AS revenue, COUNT(*)::int AS orders
      FROM payments p JOIN businesses b ON b.id = p.business_id LEFT JOIN media_assets m ON m.id = b.logo_asset_id
      WHERE p.status = 'PAID' AND p.purpose::text IN (${Prisma.join(SALE_PURPOSES)})
        AND p.paid_at >= ${from} AND p.paid_at < ${to} ${this.filters(region, categoryId)}
      GROUP BY b.id, b.name, m.url ORDER BY revenue DESC`);
    return rows.map((r) => ({ id: r.id, name: r.name, logoUrl: r.logo_url, revenue: Number(r.revenue), orders: Number(r.orders) }));
  }
}
