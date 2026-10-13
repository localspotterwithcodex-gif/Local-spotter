import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CreateShopRouteDto, CreateRouteStopDto, UpdateShopRouteDto, UpdateRouteStopDto, QueryShopRouteDto, ReorderStopsDto } from './dto';
import { RouteStatus, UserRole, BusinessStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class ShopRoutesService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
  ) {}

  // ==========================================
  // ROUTE CRUD
  // ==========================================

  async createRoute(user: any, dto: CreateShopRouteDto) {
    if (user.role !== UserRole.BUSINESS_OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Alleen geregistreerde ondernemers of admins kunnen routes aanmaken');
    }

    let businessId: string | undefined;

    if (user.role === UserRole.BUSINESS_OWNER) {
      const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!ownerProfile) {
        throw new BadRequestException('Geen bedrijfsprofiel gevonden voor deze gebruiker');
      }

      const business = await this.prisma.business.findUnique({
        where: { id: ownerProfile.id === '' ? undefined : undefined },
      });
      // Find business by ownerProfileId
      const businesses = await this.prisma.business.findMany({
        where: { ownerProfileId: ownerProfile.id },
      });
      if (businesses.length === 0) {
        throw new BadRequestException('Geen actieve winkel gevonden voor deze eigenaar');
      }
      businessId = businesses[0].id;

      const hasEntitlement = await this.entitlementService.hasFeature(businessId, 'SHOPROUTES');
      if (!hasEntitlement) {
        throw new ForbiddenException(
          'Deze winkel heeft geen actief Shoproutes abonnement',
        );
      }
    }

    const existingSlug = await this.prisma.shopRoute.findFirst({
      where: { slug: this.slugify(dto.title), businessId },
    });
    let slug = this.slugify(dto.title);
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const shouldPublish = dto.publish !== true;
    const status = shouldPublish ? RouteStatus.PUBLISHED : RouteStatus.DRAFT;

    const route = await this.prisma.shopRoute.create({
      data: {
        businessId,
        createdByBusinessId: businessId || null,
        createdByUserId: user.id,
        title: dto.title,
        slug,
        description: dto.description || null,
        city: dto.city,
        status,
      },
    });

    if (dto.stops && dto.stops.length > 0) {
      await this.createStops(route.id, dto.stops);
    }

    return this.getRouteById(route.id);
  }

  async getPublicRoutes(query: QueryShopRouteDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      status: RouteStatus.PUBLISHED,
      deletedAt: null,
    };

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.businessId) {
      where.businessId = query.businessId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [routes, total] = await Promise.all([
      this.prisma.shopRoute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: { id: true, name: true, slug: true, city: true, latitude: true, longitude: true },
          },
          stops: {
            orderBy: { sequence: 'asc' },
            include: { business: { select: { id: true, name: true, slug: true, city: true } } },
          },
        },
      }),
      this.prisma.shopRoute.count({ where }),
    ]);

    return {
      data: routes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRouteById(routeId: string, user?: any) {
    const route = await this.prisma.shopRoute.findUnique({
      where: { id: routeId },
      include: {
        business: {
          select: { id: true, name: true, slug: true, city: true, latitude: true, longitude: true },
        },
        stops: {
          orderBy: { sequence: 'asc' },
          include: { business: { select: { id: true, name: true, slug: true, city: true, latitude: true, longitude: true } } },
        },
      },
    });

    if (!route || route.deletedAt) {
      throw new NotFoundException('Route niet gevonden');
    }

    if (route.status !== RouteStatus.PUBLISHED) {
      if (!user) {
        throw new ForbiddenException('Deze route is niet openbaar');
      }
      await this.verifyRouteOwnership(route, user);
    }

    return route;
  }

  async getBusinessRoutes(businessId: string, user: any, query: QueryShopRouteDto) {
    await this.verifyBusinessOwnership(businessId, user);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [routes, total] = await Promise.all([
      this.prisma.shopRoute.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true, slug: true, city: true } },
          stops: { orderBy: { sequence: 'asc' } },
        },
      }),
      this.prisma.shopRoute.count({ where: { businessId } }),
    ]);

    return {
      data: routes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateRoute(routeId: string, user: any, dto: UpdateShopRouteDto) {
    const route = await this.prisma.shopRoute.findUnique({
      where: { id: routeId },
      include: { business: true },
    });

    if (!route || route.deletedAt) {
      throw new NotFoundException('Route niet gevonden');
    }

    await this.verifyRouteOwnership(route, user);

    let slug = route.slug;
    if (dto.title && dto.title !== route.title) {
      slug = this.slugify(dto.title);
      const existingSlug = await this.prisma.shopRoute.findFirst({
        where: { businessId: route.businessId, slug, id: { not: routeId } },
      });
      if (existingSlug) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    return this.prisma.shopRoute.update({
      where: { id: routeId },
      data: {
        title: dto.title,
        slug,
        description: dto.description !== undefined ? dto.description : undefined,
        city: dto.city !== undefined ? dto.city : undefined,
        status: dto.status,
      },
      include: {
        business: { select: { id: true, name: true, slug: true, city: true } },
        stops: { orderBy: { sequence: 'asc' } },
      },
    });
  }

  async cancelRoute(routeId: string, user: any) {
    const route = await this.prisma.shopRoute.findUnique({
      where: { id: routeId },
      include: { business: true },
    });

    if (!route || route.deletedAt) {
      throw new NotFoundException('Route niet gevonden');
    }

    await this.verifyRouteOwnership(route, user);

    return this.prisma.$transaction(async (tx) => {
      await tx.shopRoute.update({
        where: { id: routeId },
        data: { status: RouteStatus.ARCHIVED, deletedAt: new Date() },
      });

      return tx.shopRoute.findUnique({
        where: { id: routeId },
        include: {
          business: { select: { id: true, name: true, slug: true, city: true } },
          stops: true,
        },
      });
    });
  }

  // ==========================================
  // ROUTE STOPS
  // ==========================================

  async addStop(routeId: string, user: any, dto: CreateRouteStopDto) {
    const route = await this.prisma.shopRoute.findUnique({
      where: { id: routeId },
      include: { business: true },
    });

    if (!route || route.deletedAt) {
      throw new NotFoundException('Route niet gevonden');
    }

    await this.verifyRouteOwnership(route, user);

    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });

    if (!business || business.deletedAt || business.status !== BusinessStatus.ACTIVE) {
      throw new BadRequestException('De referentiebedrijf is niet actief');
    }

    const hasEntitlement = await this.entitlementService.hasFeature(business.id, 'SHOPROUTES');
    if (!hasEntitlement) {
      throw new ForbiddenException('Het referentiebedrijf heeft geen actief Shoproutes abonnement');
    }

    const existingStopCount = await this.prisma.routeStop.count({
      where: { routeId, businessId: dto.businessId },
    });
    if (existingStopCount > 0) {
      throw new ConflictException('Deze bedrijf is al een stop in deze route');
    }

    const stop = await this.prisma.routeStop.create({
      data: {
        routeId,
        businessId: dto.businessId,
        title: dto.title,
        latitude: dto.latitude,
        longitude: dto.longitude,
        description: dto.description || null,
        sequence: dto.sequence,
      },
      include: { business: { select: { id: true, name: true, slug: true, city: true } } },
    });

    return stop;
  }

  async updateStop(routeId: string, stopId: string, user: any, dto: UpdateRouteStopDto) {
    const stop = await this.prisma.routeStop.findUnique({
      where: { id: stopId },
      include: { route: { include: { business: true } } },
    });

    if (!stop || stop.route.deletedAt) {
      throw new NotFoundException('Stop niet gevonden');
    }

    await this.verifyRouteOwnership(stop.route, user);

    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });
    if (!business || business.deletedAt || business.status !== BusinessStatus.ACTIVE) {
      throw new BadRequestException('Het referentiebedrijf is niet actief');
    }

    const hasEntitlement = await this.entitlementService.hasFeature(business.id, 'SHOPROUTES');
    if (!hasEntitlement) {
      throw new ForbiddenException('Het referentiebedrijf heeft geen actief Shoproutes abonnement');
    }

    return this.prisma.routeStop.update({
      where: { id: stopId },
      data: {
        businessId: dto.businessId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        description: dto.description,
        sequence: dto.sequence,
      },
      include: { business: { select: { id: true, name: true, slug: true, city: true } } },
    });
  }

  async removeStop(routeId: string, stopId: string, user: any) {
    const stop = await this.prisma.routeStop.findUnique({
      where: { id: stopId },
      include: { route: { include: { business: true } } },
    });

    if (!stop || stop.route.deletedAt) {
      throw new NotFoundException('Stop niet gevonden');
    }

    await this.verifyRouteOwnership(stop.route, user);

    return this.prisma.routeStop.delete({
      where: { id: stopId },
    });
  }

  async reorderStops(routeId: string, user: any, dto: ReorderStopsDto) {
    const route = await this.prisma.shopRoute.findUnique({
      where: { id: routeId },
      include: { business: true },
    });

    if (!route || route.deletedAt) {
      throw new NotFoundException('Route niet gevonden');
    }

    await this.verifyRouteOwnership(route, user);

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.stops) {
        await tx.routeStop.update({
          where: { id: item.id },
          data: { sequence: item.sequence },
        });
      }

      return tx.routeStop.findMany({
        where: { routeId },
        orderBy: { sequence: 'asc' },
        include: { business: { select: { id: true, name: true, slug: true, city: true, latitude: true, longitude: true } } },
      });
    });
  }

  async getStops(routeId: string) {
    const route = await this.prisma.shopRoute.findUnique({
      where: { id: routeId },
    });

    if (!route || route.deletedAt) {
      throw new NotFoundException('Route niet gevonden');
    }

    return this.prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { sequence: 'asc' },
      include: { business: { select: { id: true, name: true, slug: true, city: true, latitude: true, longitude: true } } },
    });
  }

  // ==========================================
  // MAP BUSINESSES
  // ==========================================

  async getMapBusinesses(query: QueryShopRouteDto) {
    const where: any = {
      status: BusinessStatus.ACTIVE,
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { gt: new Date() },
      },
    };

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.businessId) {
      where.id = query.businessId;
    }

    return this.prisma.business.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        description: true,
        latitude: true,
        longitude: true,
        status: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async verifyRouteOwnership(route: any, user: any) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (route.status === RouteStatus.PUBLISHED || route.status === RouteStatus.ARCHIVED) {
      if (route.createdByUserId === user.id) {
        return;
      }
    }

    if (route.businessId) {
      if (user.role === UserRole.BUSINESS_OWNER) {
        const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
          where: { userId: user.id },
        });
        const business = await this.prisma.business.findUnique({
          where: { id: route.businessId },
        });
        if (business && ownerProfile && business.ownerProfileId === ownerProfile.id) {
          return;
        }
      }
    }

    throw new ForbiddenException('Je bent niet gemachtigd om deze route te beheren');
  }

  private async verifyBusinessOwnership(businessId: string, user: any) {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!ownerProfile) {
      throw new ForbiddenException('Geen bedrijfsprofiel gevonden');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business || business.deletedAt) {
      throw new NotFoundException('Winkel niet gevonden');
    }

    if (business.ownerProfileId !== ownerProfile.id) {
      throw new ForbiddenException('Je bent niet de eigenaar van deze winkel');
    }

    return business;
  }

  private async createStops(routeId: string, stops: CreateRouteStopDto[]) {
    for (const stop of stops) {
      const business = await this.prisma.business.findUnique({
        where: { id: stop.businessId },
      });
      if (!business || business.deletedAt || business.status !== BusinessStatus.ACTIVE) {
        throw new BadRequestException(`Bedrijf ${stop.businessId} is niet actief`);
      }

      const hasEntitlement = await this.entitlementService.hasFeature(business.id, 'SHOPROUTES');
      if (!hasEntitlement) {
        throw new ForbiddenException(`Bedrijf ${stop.businessId} heeft geen Shoproutes abonnement`);
      }
    }

    await this.prisma.routeStop.createMany({
      data: stops.map((stop) => ({
        routeId,
        businessId: stop.businessId,
        title: stop.title,
        latitude: stop.latitude,
        longitude: stop.longitude,
        description: stop.description || null,
        sequence: stop.sequence,
      })),
    });
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
