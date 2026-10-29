import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, RouteStatus, WorkshopStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ViewKind = 'shop' | 'route' | 'workshop';
export const VIEW_KINDS: readonly ViewKind[] = ['shop', 'route', 'workshop'];

interface Viewer {
  userId?: string;
  ip?: string;
}

/**
 * Counts public page views for shops, shop routes and workshops (products have their own counter).
 * Not counted: the owner's own visits, unpublished/deleted items, and the same visitor (user id or IP)
 * again within 30 minutes.
 */
@Injectable()
export class ViewsService {
  private recentViews = new Map<string, number>();
  private static readonly WINDOW_MS = 30 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async record(kind: ViewKind, id: string, viewer: Viewer): Promise<{ viewCount: number; counted: boolean }> {
    const item = await this.find(kind, id);
    if (!item) throw new NotFoundException('Niet gevonden');
    if (viewer.userId && item.ownerUserId && viewer.userId === item.ownerUserId) {
      return { viewCount: item.viewCount, counted: false };
    }

    const now = Date.now();
    const key = `${kind}:${id}:${viewer.userId ?? viewer.ip ?? 'anon'}`;
    const last = this.recentViews.get(key);
    if (last !== undefined && now - last < ViewsService.WINDOW_MS) return { viewCount: item.viewCount, counted: false };
    if (this.recentViews.size > 5000) {
      for (const [k, t] of this.recentViews) if (now - t >= ViewsService.WINDOW_MS) this.recentViews.delete(k);
      if (this.recentViews.size > 5000) this.recentViews.clear();
    }
    this.recentViews.set(key, now);

    const data = { viewCount: { increment: 1 } };
    const select = { viewCount: true };
    const updated =
      kind === 'shop'
        ? await this.prisma.business.update({ where: { id }, data, select })
        : kind === 'route'
          ? await this.prisma.shopRoute.update({ where: { id }, data, select })
          : await this.prisma.workshop.update({ where: { id }, data, select });
    return { viewCount: updated.viewCount, counted: true };
  }

  private async find(kind: ViewKind, id: string): Promise<{ viewCount: number; ownerUserId?: string } | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    if (kind === 'shop') {
      const b = await this.prisma.business.findFirst({
        where: { id, deletedAt: null, status: BusinessStatus.ACTIVE },
        select: { viewCount: true, ownerProfile: { select: { userId: true } } },
      });
      return b ? { viewCount: b.viewCount, ownerUserId: b.ownerProfile?.userId } : null;
    }
    if (kind === 'route') {
      const r = await this.prisma.shopRoute.findFirst({
        where: { id, deletedAt: null, status: RouteStatus.PUBLISHED },
        select: { viewCount: true, createdByUserId: true },
      });
      return r ? { viewCount: r.viewCount, ownerUserId: r.createdByUserId ?? undefined } : null;
    }
    const w = await this.prisma.workshop.findFirst({
      where: { id, status: { in: [WorkshopStatus.PUBLISHED, WorkshopStatus.FULL] } },
      select: { viewCount: true, business: { select: { ownerProfile: { select: { userId: true } } } } },
    });
    return w ? { viewCount: w.viewCount, ownerUserId: w.business?.ownerProfile?.userId } : null;
  }
}
