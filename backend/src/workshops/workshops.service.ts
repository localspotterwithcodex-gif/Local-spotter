import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { QueryWorkshopDto } from './dto/query-workshop.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import {
  WorkshopStatus,
  BookingStatus,
  UserRole,
  BusinessStatus,
  SubscriptionStatus,
} from '@prisma/client';

@Injectable()
export class WorkshopsService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
  ) {}

  // ==========================================
  // WORKSHOP CRUD
  // ==========================================

  async createWorkshop(user: any, dto: CreateWorkshopDto) {
    if (user.role !== UserRole.BUSINESS_OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Alleen geregistreerde ondernemers kunnen workshops aanmaken');
    }

    const business = await this.verifyBusinessOwnership(dto.businessId, user);

    const hasEntitlement = await this.entitlementService.hasFeature(dto.businessId, 'WORKSHOPS');
    if (!hasEntitlement) {
      throw new ForbiddenException(
        'Deze winkel heeft geen actief WORKSHOP abonnement om workshops te publiceren',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();

    if (startTime <= now) {
      throw new BadRequestException('De starttijd moet in de toekomst liggen');
    }

    if (endTime <= startTime) {
      throw new BadRequestException('De eindtijd moet na de starttijd liggen');
    }

    const status = dto.status || WorkshopStatus.PUBLISHED;

    let slug = this.slugify(dto.title);
    const existingSlug = await this.prisma.workshop.findFirst({
      where: { businessId: dto.businessId, slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.workshop.create({
      data: {
        businessId: dto.businessId,
        title: dto.title,
        slug,
        description: dto.description || null,
        price: dto.price,
        capacity: dto.capacity,
        startTime,
        endTime,
        location: dto.location || null,
        latitude: dto.latitude || null,
        longitude: dto.longitude || null,
        imageUrl: dto.imageUrl || null,
        imageAssetId: dto.imageAssetId || null,
        status,
      },
      include: {
        business: {
          select: { id: true, name: true, slug: true, city: true },
        },
      },
    });
  }

  async getPublicWorkshops(query: QueryWorkshopDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const upcomingOnly = query.upcomingOnly !== false;

    const where: any = {
      status: { in: [WorkshopStatus.PUBLISHED, WorkshopStatus.FULL] },
      business: {
        status: BusinessStatus.ACTIVE,
        subscription: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: { gt: new Date() },
        },
      },
    };

    if (upcomingOnly) {
      where.startTime = { gt: new Date() };
    }

    if (query.businessId) {
      where.businessId = query.businessId;
    }

    if (query.city) {
      where.business = { ...where.business, city: { contains: query.city, mode: 'insensitive' } };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [workshops, total] = await Promise.all([
      this.prisma.workshop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          business: {
            select: { id: true, name: true, slug: true, city: true, logoAssetId: true },
          },
          imageAsset: { select: { id: true, url: true } },
        },
      }),
      this.prisma.workshop.count({ where }),
    ]);

    const data = workshops.map((w) => ({
      ...w,
      remainingSeats: Math.max(w.capacity - w.bookedCount, 0),
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getWorkshopById(workshopId: string, user: any) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        business: {
          include: {
            subscription: { include: { plan: true } },
          },
        },
        imageAsset: { select: { id: true, url: true } },
        bookings: {
          where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
          include: { consumerProfile: { select: { id: true, displayName: true } } },
        },
      },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop niet gevonden');
    }

    const ownerProfile = user?.role === UserRole.BUSINESS_OWNER
      ? await this.prisma.businessOwnerProfile.findUnique({ where: { userId: user.id } })
      : null;

    const isOwnerOrAdmin =
      user?.role === UserRole.SUPER_ADMIN ||
      (user?.role === UserRole.BUSINESS_OWNER &&
        workshop.business.ownerProfileId === ownerProfile?.id);

    if (
      !isOwnerOrAdmin &&
      (workshop.status === WorkshopStatus.DRAFT || workshop.status === WorkshopStatus.CANCELLED)
    ) {
      throw new ForbiddenException('Je hebt geen toegang tot deze workshop');
    }

    return {
      ...workshop,
      remainingSeats: Math.max(workshop.capacity - workshop.bookedCount, 0),
    };
  }

  async getBusinessWorkshops(businessId: string, user: any, query: QueryWorkshopDto) {
    await this.verifyBusinessOwnership(businessId, user);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [workshops, total] = await Promise.all([
      this.prisma.workshop.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true, slug: true, city: true } },
          imageAsset: { select: { id: true, url: true } },
        },
      }),
      this.prisma.workshop.count({ where: { businessId } }),
    ]);

    return {
      data: workshops,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateWorkshop(workshopId: string, user: any, dto: UpdateWorkshopDto) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { business: true },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop niet gevonden');
    }
    if ((workshop as any).deletedAt) {
      throw new NotFoundException('Workshop niet gevonden');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!ownerProfile || workshop.business.ownerProfileId !== ownerProfile.id) {
        throw new ForbiddenException('Je bent niet gemachtigd om deze workshop te bewerken');
      }
    }

    if (dto.capacity !== undefined && dto.capacity < workshop.bookedCount) {
      throw new BadRequestException(
        `Nieuwe capaciteit (${dto.capacity}) kan niet kleiner zijn dan het aantal geboekte plaatsen (${workshop.bookedCount})`,
      );
    }

    if (dto.startTime || dto.endTime) {
      const startTime = dto.startTime ? new Date(dto.startTime) : workshop.startTime;
      const endTime = dto.endTime ? new Date(dto.endTime) : workshop.endTime;
      const now = new Date();

      if (startTime <= now) {
        throw new BadRequestException('De starttijd moet in de toekomst liggen');
      }
      if (endTime <= startTime) {
        throw new BadRequestException('De eindtijd moet na de starttijd liggen');
      }
    }

    const updated = await this.prisma.workshop.update({
      where: { id: workshopId },
      data: {
        title: dto.title,
        description: dto.description !== undefined ? dto.description : undefined,
        price: dto.price !== undefined ? dto.price : undefined,
        capacity: dto.capacity !== undefined ? dto.capacity : undefined,
        location: dto.location !== undefined ? dto.location : undefined,
        latitude: dto.latitude !== undefined ? dto.latitude : undefined,
        longitude: dto.longitude !== undefined ? dto.longitude : undefined,
        startTime: dto.startTime !== undefined ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime !== undefined ? new Date(dto.endTime) : undefined,
        imageUrl: dto.imageUrl !== undefined ? dto.imageUrl : undefined,
        imageAssetId: dto.imageAssetId !== undefined ? dto.imageAssetId : undefined,
        status: dto.status,
      },
      include: {
        business: { select: { id: true, name: true, slug: true, city: true } },
        imageAsset: { select: { id: true, url: true } },
      },
    });

    if (dto.status === WorkshopStatus.PUBLISHED && workshop.status === WorkshopStatus.FULL) {
      await this.prisma.workshop.update({
        where: { id: workshopId },
        data: { status: WorkshopStatus.PUBLISHED },
      });
    }

    return updated;
  }

  async cancelWorkshop(workshopId: string, user: any) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: workshopId },
      include: { business: true },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop niet gevonden');
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!ownerProfile || workshop.business.ownerProfileId !== ownerProfile.id) {
        throw new ForbiddenException('Je bent niet gemachtigd om deze workshop te annuleren');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workshop.update({
        where: { id: workshopId },
        data: { status: WorkshopStatus.CANCELLED },
      });

      return tx.workshop.findUnique({
        where: { id: workshopId },
        include: {
          business: { select: { id: true, name: true, slug: true, city: true } },
          imageAsset: { select: { id: true, url: true } },
        },
      });
    });
  }

  // ==========================================
  // BOOKING CRUD
  // ==========================================

  async createBooking(workshopId: string, user: any, dto: CreateBookingDto) {
    const consumerProfile = await this.getConsumerProfile(user);

    const result = await this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopId },
        include: { business: true },
      });

      if (!workshop) {
        throw new NotFoundException('Workshop niet gevonden');
      }

      if (workshop.status !== WorkshopStatus.PUBLISHED) {
        throw new BadRequestException('Deze workshop is niet beschikbaar voor boekingen');
      }

      if (new Date(workshop.startTime) <= new Date()) {
        throw new BadRequestException('Deze workshop heeft al begonnen');
      }

      const business = workshop.business;
      const hasEntitlement = await this.entitlementService.hasFeature(business.id, 'WORKSHOPS');
      if (!hasEntitlement) {
        throw new ForbiddenException(
          'De winkel heeft geen actief WORKSHOP abonnement',
        );
      }

      const quantity = dto.quantity;
      const newBookedCount = workshop.bookedCount + quantity;

      const rowsAffected = await tx.$executeRaw`
        UPDATE "workshops"
        SET "booked_count" = "booked_count" + ${quantity}
        WHERE "id" = ${workshopId}::uuid AND ("capacity" - "booked_count") >= ${quantity}
      `;

      if (rowsAffected === 0) {
        throw new ConflictException(
          'Niet genoeg beschikbare plaatsen voor deze workshop',
        );
      }

      const unitPrice = Number(workshop.price);
      const totalAmount = unitPrice * quantity;

      const booking = await tx.workshopBooking.create({
        data: {
          workshopId,
          consumerProfileId: consumerProfile.id,
          ticketQuantity: quantity,
          unitPrice,
          totalAmount,
          status: BookingStatus.CONFIRMED,
        },
        include: {
          workshop: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              location: true,
              capacity: true,
              bookedCount: true,
              price: true,
              status: true,
              business: {
                select: { id: true, name: true, slug: true, city: true, phone: true, email: true },
              },
            },
          },
          consumerProfile: {
            select: { id: true, displayName: true, firstName: true, lastName: true, phone: true },
          },
        },
      });

      if (newBookedCount >= workshop.capacity) {
        await tx.workshop.update({
          where: { id: workshopId },
          data: { status: WorkshopStatus.FULL },
        });
      }

      return { booking, workshop };
    });

    return {
      ...result.booking,
      workshop: {
        ...result.workshop,
        remainingSeats: Math.max(result.workshop.capacity - result.workshop.bookedCount, 0),
      },
    };
  }

  async getConsumerBookings(user: any, query: QueryBookingDto) {
    const consumerProfile = await this.getConsumerProfile(user);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      consumerProfileId: consumerProfile.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.workshopId) {
      where.workshopId = query.workshopId;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.workshopBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workshop: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              location: true,
              capacity: true,
              bookedCount: true,
              price: true,
              status: true,
              imageUrl: true,
              business: {
                select: { id: true, name: true, slug: true, city: true },
              },
            },
          },
        },
      }),
      this.prisma.workshopBooking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBookingById(bookingId: string, user: any) {
    const booking = await this.prisma.workshopBooking.findUnique({
      where: { id: bookingId },
      include: {
        workshop: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
            capacity: true,
            bookedCount: true,
            price: true,
            status: true,
            imageUrl: true,
            business: {
              select: { id: true, name: true, slug: true, city: true },
            },
          },
        },
        consumerProfile: {
          select: { id: true, displayName: true, firstName: true, lastName: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Boeking niet gevonden');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return booking;
    }

    if (user.role === UserRole.CONSUMER) {
      const consumerProfile = await this.prisma.consumerProfile.findUnique({
        where: { userId: user.id },
      });
      if (consumerProfile && booking.consumerProfileId === consumerProfile.id) {
        return booking;
      }
      throw new ForbiddenException('Je hebt geen toegang tot deze boeking');
    }

    if (user.role === UserRole.BUSINESS_OWNER) {
      const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!ownerProfile) {
        throw new ForbiddenException('Geen bedrijfsprofiel gevonden');
      }
      const workshop = await this.prisma.workshop.findUnique({
        where: { id: booking.workshopId },
        select: { businessId: true },
      });
      if (workshop && workshop.businessId) {
        const business = await this.prisma.business.findUnique({
          where: { id: workshop.businessId },
          select: { ownerProfileId: true },
        });
        if (business && business.ownerProfileId === ownerProfile.id) {
          return booking;
        }
      }
      throw new ForbiddenException('Je hebt geen toegang tot deze boeking');
    }

    throw new ForbiddenException('Je hebt geen toegang tot deze boeking');
  }

  async getBusinessBookings(businessId: string, user: any, query: QueryBookingDto) {
    await this.verifyBusinessOwnership(businessId, user);

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {
      workshop: { businessId },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.workshopId) {
      where.workshopId = query.workshopId;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.workshopBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workshop: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              location: true,
              capacity: true,
              bookedCount: true,
              price: true,
              status: true,
              imageUrl: true,
            },
          },
          consumerProfile: {
            select: { id: true, displayName: true, firstName: true, lastName: true, phone: true },
          },
        },
      }),
      this.prisma.workshopBooking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancelBooking(bookingId: string, user: any) {
    const booking = await this.prisma.workshopBooking.findUnique({
      where: { id: bookingId },
      include: { workshop: true },
    });

    if (!booking) {
      throw new NotFoundException('Boeking niet gevonden');
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Alleen actieve boekingen kunnen worden geannuleerd');
    }

    if (new Date(booking.workshop.startTime) <= new Date()) {
      throw new BadRequestException('De workshop heeft al begonnen en kan niet meer worden geannuleerd');
    }

    if (user.role === UserRole.CONSUMER) {
      const consumerProfile = await this.prisma.consumerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!consumerProfile || booking.consumerProfileId !== consumerProfile.id) {
        throw new ForbiddenException('Je kunt alleen je eigen boekingen annuleren');
      }
    } else if (user.role === UserRole.BUSINESS_OWNER) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { id: booking.workshopId },
        select: { businessId: true },
      });
      if (workshop) {
        await this.verifyBusinessOwnership(workshop.businessId, user);
      }
    } else if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Onbevoegd om deze boeking te annuleren');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workshopBooking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED, updatedAt: new Date() },
      });

      const updatedWorkshop = await tx.workshop.update({
        where: { id: booking.workshopId },
        data: {
          bookedCount: { decrement: booking.ticketQuantity },
        },
      });

      if (booking.workshop.status === WorkshopStatus.FULL) {
        const recalculatedBooked = updatedWorkshop.bookedCount;
        if (recalculatedBooked < updatedWorkshop.capacity) {
          await tx.workshop.update({
            where: { id: booking.workshopId },
            data: { status: WorkshopStatus.PUBLISHED },
          });
        }
      }

      return tx.workshopBooking.findUnique({
        where: { id: bookingId },
        include: {
          workshop: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
              location: true,
              capacity: true,
              bookedCount: true,
              price: true,
              status: true,
              business: {
                select: { id: true, name: true, slug: true, city: true },
              },
            },
          },
          consumerProfile: {
            select: { id: true, displayName: true, firstName: true, lastName: true },
          },
        },
      });
    });
  }

  // ==========================================
  // OWNERSHIP HELPERS
  // ==========================================

  private async verifyBusinessOwnership(businessId: string, user: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
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
      throw new ForbiddenException('Je bent niet gemachtigd om workshops voor deze winkel te beheren');
    }

    return business;
  }

  private async getConsumerProfile(user: any) {
    const profile = await this.prisma.consumerProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      throw new ForbiddenException('Geen consumentenprofiel gevonden voor deze gebruiker');
    }
    return profile;
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
