import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { Prisma, BusinessStatus, SubscriptionStatus, UserRole, ReviewStatus } from '@prisma/client';
import { boundingBox, haversineKm, hasGeo, toNum } from '../common/geo';
import { QueryBusinessDto } from './dto/query-business.dto';
import { TranslationService } from '../translation/translation.service';

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private translation: TranslationService,
  ) {}

  async create(user: any, dto: CreateBusinessDto) {
    if (user.role !== UserRole.BUSINESS_OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Alleen geregistreerde ondernemers kunnen een winkel aanmaken');
    }

    // Get owner profile
    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile) {
      throw new BadRequestException('Geen ondernemersprofiel gevonden voor deze gebruiker');
    }

    // Generate unique slug
    let slug = this.slugify(dto.name);
    const existingSlug = await this.prisma.business.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Auto-translate the shop description to EN + NL (best effort; never blocks saving).
    const i18n = await this.translation.translateFields({ description: dto.description });

    return this.prisma.business.create({
      data: {
        ownerProfileId: ownerProfile.id,
        name: dto.name,
        slug,
        translations: i18n.translations ?? undefined,
        sourceLocale: i18n.sourceLocale,
        description: dto.description || null,
        phone: dto.phone || null,
        email: dto.email || null,
        kvkNumber: dto.kvkNumber,
        categoryId: dto.categoryId || null,
        state: dto.state,
        city: dto.city,
        street: dto.address,
        address: dto.address,
        postalCode: dto.postalCode || null,
        latitude: dto.latitude ? dto.latitude : null,
        longitude: dto.longitude ? dto.longitude : null,
        status: BusinessStatus.PENDING_APPROVAL,
      },
      include: {
        category: true,
        hours: true,
        logoAsset: { select: { url: true } },
        coverAsset: { select: { url: true } },
        panoramaAsset: { select: { url: true } },
        _count: { select: { products: { where: { active: true, deletedAt: null } } } },
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  /** Public listing: only ACTIVE businesses whose subscription is currently running. */
  async getPublicBusinesses(query: QueryBusinessDto) {
    const where: Prisma.BusinessWhereInput = {
      deletedAt: null,
      status: BusinessStatus.ACTIVE,
      subscription: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: { gt: new Date() } },
    };
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const geo = hasGeo(query) ? query : null;
    if (geo) {
      const box = boundingBox(geo.lat, geo.lng, geo.radiusKm);
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLng, lte: box.maxLng };
    }
    const rows = await this.prisma.business.findMany({
      where,
      include: {
        category: true,
        hours: true,
        logoAsset: { select: { url: true } },
        coverAsset: { select: { url: true } },
        panoramaAsset: { select: { url: true } },
        _count: { select: { products: { where: { active: true, deletedAt: null } } } },
        subscription: { include: { plan: true } },
      },
      orderBy: query.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' },
      take: query.limit ?? 100,
    });
    await this.backfillTranslations(rows);
    let result: any[] = await this.withLiveCounts(rows);
    if (geo) {
      result = result
        .map((b) => {
          const lat = toNum(b.latitude);
          const lng = toNum(b.longitude);
          return { ...b, distanceKm: lat === null || lng === null ? null : haversineKm(geo.lat, geo.lng, lat, lng) };
        })
        .filter((b) => b.distanceKm !== null && b.distanceKm <= geo.radiusKm);
    }
    if (query.sort === 'distance' && geo) result.sort((a, b) => a.distanceKm - b.distanceKm);
    else if (query.sort === 'rating') result.sort((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount);
    return result;
  }

  private backfillTranslations(rows: any[]) {
    return this.translation.backfill(rows, ['description'], (r, b) =>
      this.prisma.business.update({ where: { id: r.id }, data: { translations: b.translations as any, sourceLocale: b.sourceLocale } }),
    );
  }

  /**
   * Followers and rating are derived from the real `followers` / `reviews` rows.
   * The denormalised `followerCount` / `averageRating` / `ratingCount` columns are not
   * maintained everywhere (and hold demo-seed numbers), so they are never trusted.
   */
  private async withLiveCounts<T extends { id: string }>(
    rows: T[],
  ): Promise<(T & { followerCount: number; averageRating: number; ratingCount: number })[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [followers, ratings] = await Promise.all([
      this.prisma.follower.groupBy({ by: ['businessId'], where: { businessId: { in: ids } }, _count: { _all: true } }),
      this.prisma.review.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, status: ReviewStatus.PUBLISHED },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    const f = new Map(followers.map((g) => [g.businessId, g._count._all]));
    const r = new Map(ratings.map((g) => [g.businessId, g]));
    return rows.map((row) => {
      const g = r.get(row.id);
      return {
        ...row,
        followerCount: f.get(row.id) ?? 0,
        averageRating: g?._avg.rating != null ? Math.round(g._avg.rating * 10) / 10 : 0,
        ratingCount: g?._count._all ?? 0,
      };
    });
  }

  async getMyBusinesses(user: any) {
    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile) {
      return [];
    }

    const rows = await this.prisma.business.findMany({
      where: { ownerProfileId: ownerProfile.id, deletedAt: null },
      include: {
        category: true,
        hours: true,
        logoAsset: { select: { url: true } },
        coverAsset: { select: { url: true } },
        panoramaAsset: { select: { url: true } },
        _count: { select: { products: { where: { active: true, deletedAt: null } } } },
        subscription: {
          include: { plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.withLiveCounts(rows);
  }

  async getPublicBusinessByIdOrSlug(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const business = await this.prisma.business.findFirst({
      where: {
        OR: isUuid ? [{ id: idOrSlug }, { slug: idOrSlug }] : [{ slug: idOrSlug }],
        deletedAt: null,
      },
      include: {
        category: true,
        hours: true,
        logoAsset: { select: { url: true } },
        coverAsset: { select: { url: true } },
        panoramaAsset: { select: { url: true } },
        _count: { select: { products: { where: { active: true, deletedAt: null } } } },
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    await this.backfillTranslations([business]);
    const [withCounts] = await this.withLiveCounts([business]);
    return withCounts;
  }

  async update(id: string, user: any, dto: UpdateBusinessDto) {
    const business = await this.verifyOwnership(id, user);

    let slug = business.slug;
    if (dto.name && dto.name !== business.name) {
      slug = this.slugify(dto.name);
      const existingSlug = await this.prisma.business.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existingSlug) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const i18n =
      dto.description !== undefined && dto.description !== business.description
        ? await this.translation.translateFields({ description: dto.description })
        : null;

    const pickup = dto.pickupEnabled ?? business.pickupEnabled;
    const shipping = dto.shippingEnabled ?? business.shippingEnabled;
    const local = dto.localDeliveryEnabled ?? business.localDeliveryEnabled;
    if (!pickup && !shipping && !local) {
      throw new BadRequestException('Schakel minimaal één leveringswijze in (afhalen, verzenden of lokale bezorging)');
    }

    for (const assetId of [dto.logoAssetId, dto.coverAssetId, dto.panoramaAssetId]) {
      if (assetId) {
        const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { id: true } });
        if (!asset) throw new BadRequestException('Afbeelding niet gevonden, upload de afbeelding opnieuw');
      }
    }

    return this.prisma.business.update({
      where: { id },
      data: {
        name: dto.name,
        logoAssetId: dto.logoAssetId,
        coverAssetId: dto.coverAssetId,
        panoramaAssetId: dto.panoramaAssetId,
        ...(i18n ? { translations: i18n.translations ?? Prisma.DbNull, sourceLocale: i18n.sourceLocale } : {}),
        slug,
        description: dto.description !== undefined ? dto.description : undefined,
        phone: dto.phone !== undefined ? dto.phone : undefined,
        email: dto.email !== undefined ? dto.email : undefined,
        websiteUrl: dto.websiteUrl !== undefined ? dto.websiteUrl || null : undefined,
        instagramUrl: dto.instagramUrl !== undefined ? dto.instagramUrl || null : undefined,
        facebookUrl: dto.facebookUrl !== undefined ? dto.facebookUrl || null : undefined,
        tiktokUrl: dto.tiktokUrl !== undefined ? dto.tiktokUrl || null : undefined,
        kvkNumber: dto.kvkNumber !== undefined ? dto.kvkNumber : undefined,
        categoryId: dto.categoryId !== undefined ? dto.categoryId : undefined,
        state: dto.state !== undefined ? dto.state : undefined,
        city: dto.city !== undefined ? dto.city : undefined,
        street: dto.address !== undefined ? dto.address : undefined,
        address: dto.address !== undefined ? dto.address : undefined,
        postalCode: dto.postalCode !== undefined ? dto.postalCode : undefined,
        latitude: dto.latitude !== undefined ? dto.latitude : undefined,
        longitude: dto.longitude !== undefined ? dto.longitude : undefined,
        pickupEnabled: dto.pickupEnabled,
        shippingEnabled: dto.shippingEnabled,
        localDeliveryEnabled: dto.localDeliveryEnabled,
        shippingFee: dto.shippingFee,
        freeShippingThreshold: dto.freeShippingThreshold,
        localDeliveryFee: dto.localDeliveryFee,
        localDeliveryRadiusKm: dto.localDeliveryRadiusKm,
      },
      include: {
        category: true,
        hours: true,
        logoAsset: { select: { url: true } },
        coverAsset: { select: { url: true } },
        panoramaAsset: { select: { url: true } },
        _count: { select: { products: { where: { active: true, deletedAt: null } } } },
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  async updateStatus(id: string, user: any, dto: UpdateBusinessStatusDto) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    // Business Owners can set DRAFT or PENDING_APPROVAL for their own business.
    // Super Admins can set any status (ACTIVE, SUSPENDED, DISABLED).
    if (user.role !== UserRole.SUPER_ADMIN) {
      await this.verifyOwnership(id, user);
      if (dto.status !== BusinessStatus.DRAFT && dto.status !== BusinessStatus.PENDING_APPROVAL) {
        throw new ForbiddenException('Alleen beheerders kunnen winkels activeren of schorsen');
      }
      // An owner must not be able to lift a suspension/disable imposed by an admin.
      if (business.status === BusinessStatus.SUSPENDED || business.status === BusinessStatus.DISABLED) {
        throw new ForbiddenException('Deze winkel is door een beheerder geblokkeerd');
      }
    }

    return this.prisma.business.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async getCategories() {
    return this.prisma.businessCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateHours(id: string, user: any, dto: UpdateBusinessHoursDto) {
    await this.verifyOwnership(id, user);

    // Delete existing & create updated weekly hours in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.businessHours.deleteMany({
        where: { businessId: id },
      });

      if (dto.hours && dto.hours.length > 0) {
        await tx.businessHours.createMany({
          data: dto.hours.map((item) => ({
            businessId: id,
            dayOfWeek: item.dayOfWeek,
            openTime: item.openTime || null,
            closeTime: item.closeTime || null,
            isClosed: item.isClosed,
          })),
        });
      }
    });

    return this.prisma.businessHours.findMany({
      where: { businessId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async getHours(id: string) {
    return this.prisma.businessHours.findMany({
      where: { businessId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  private async verifyOwnership(businessId: string, user: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { ownerProfile: true },
    });

    if (!business || business.deletedAt) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return business;
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!ownerProfile || business.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenException({ statusCode: 403, message: 'Je bent niet gemachtigd om deze winkel te bewerken', code: 'NOT_SHOP_OWNER' });
    }

    return business;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
