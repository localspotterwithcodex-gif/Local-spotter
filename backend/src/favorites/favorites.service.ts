import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FavoriteIds {
  productIds: string[];
  businessIds: string[];
}

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async listIds(consumerProfileId: string): Promise<FavoriteIds> {
    const rows = await this.prisma.favorite.findMany({
      where: { consumerProfileId },
      select: { productId: true, businessId: true },
    });
    return {
      productIds: rows.flatMap((r) => (r.productId ? [r.productId] : [])),
      businessIds: rows.flatMap((r) => (r.businessId ? [r.businessId] : [])),
    };
  }

  /** Favorites with enough data to render cards. Hidden/deleted targets are skipped. */
  async list(consumerProfileId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { consumerProfileId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        product: {
          include: {
            images: { include: { mediaAsset: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
            business: { select: { id: true, name: true, slug: true, city: true, status: true } },
          },
        },
        business: {
          select: { id: true, name: true, slug: true, city: true, status: true, description: true, logoAsset: { select: { url: true } }, coverAsset: { select: { url: true } } },
        },
      },
    });
    return {
      products: rows
        .filter((r) => r.product && !r.product.deletedAt && r.product.active && r.product.business.status === BusinessStatus.ACTIVE)
        .map((r) => ({ ...r.product, favoritedAt: r.createdAt })),
      businesses: rows
        .filter((r) => r.business && r.business.status === BusinessStatus.ACTIVE)
        .map((r) => ({ ...r.business, favoritedAt: r.createdAt })),
    };
  }

  async addProduct(consumerProfileId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null, active: true, business: { status: BusinessStatus.ACTIVE } },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.favorite.upsert({
      where: { consumerProfileId_productId: { consumerProfileId, productId } },
      create: { consumerProfileId, productId },
      update: {},
    });
    return { favorite: true, count: await this.countProduct(productId) };
  }

  async removeProduct(consumerProfileId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { consumerProfileId, productId } });
    return { favorite: false, count: await this.countProduct(productId) };
  }

  async addBusiness(consumerProfileId: string, businessId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, status: BusinessStatus.ACTIVE, deletedAt: null },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    await this.prisma.favorite.upsert({
      where: { consumerProfileId_businessId: { consumerProfileId, businessId } },
      create: { consumerProfileId, businessId },
      update: {},
    });
    return { favorite: true };
  }

  async removeBusiness(consumerProfileId: string, businessId: string) {
    await this.prisma.favorite.deleteMany({ where: { consumerProfileId, businessId } });
    return { favorite: false };
  }

  countProduct(productId: string) {
    return this.prisma.favorite.count({ where: { productId } });
  }

  /** Like counts for a page of products in one grouped query. */
  async countsForProducts(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const groups = await this.prisma.favorite.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _count: { _all: true },
    });
    return new Map(groups.filter((g) => g.productId).map((g) => [g.productId as string, g._count._all]));
  }
}
