import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { TranslationService } from '../translation/translation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmployeesService } from '../employees/employees.service';
import { PaymentsService, UNPAID_HOLD_MINUTES } from '../payments/payments.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { QueryWorkshopDto } from './dto/query-workshop.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import {
  Prisma,
  WorkshopStatus,
  BookingStatus,
  SessionStatus,
  PaymentStatus,
  NotificationType,
  UserRole,
  BusinessStatus,
  SubscriptionStatus,
  SubscriptionPlanSlug,
} from '@prisma/client';

@Injectable()
export class WorkshopsService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
    private translation: TranslationService,
    private notifications: NotificationsService,
    private employees: EmployeesService,
    private payments: PaymentsService,
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

    const sessionInputs = this.parseSessions(dto);

    const status = dto.status || WorkshopStatus.PUBLISHED;

    let slug = this.slugify(dto.title);
    const existingSlug = await this.prisma.workshop.findFirst({
      where: { businessId: dto.businessId, slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Auto-translate title/description to EN + NL (best effort; never blocks saving).
    const i18n = await this.translation.translateFields({ title: dto.title, description: dto.description });

    return this.prisma.workshop.create({
      data: {
        businessId: dto.businessId,
        title: dto.title,
        translations: i18n.translations ?? undefined,
        sourceLocale: i18n.sourceLocale,
        slug,
        description: dto.description || null,
        price: dto.price,
        // Summary of the sessions below (earliest session, total seats); kept in sync by syncSummary.
        capacity: sessionInputs.reduce((n, x) => n + x.capacity, 0),
        startTime: sessionInputs[0].startTime,
        endTime: sessionInputs[0].endTime,
        sessions: { create: sessionInputs },
        ...(dto.cancellationDeadlineHours !== undefined ? { cancellationDeadlineHours: dto.cancellationDeadlineHours } : {}),
        ...(dto.refundPercentage !== undefined ? { refundPercentage: dto.refundPercentage } : {}),
        minAge: dto.minAge ?? null,
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
        sessions: { orderBy: { startTime: 'asc' } },
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
          plan: { slug: SubscriptionPlanSlug.WORKSHOP },
        },
      },
    };

    // Date filters apply to the sessions: a workshop matches when at least one live session does.
    const now = new Date();
    const range: any = {};
    if (upcomingOnly) range.gt = now;
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      range.gte = upcomingOnly && from.getTime() < now.getTime() ? now : from;
      if (range.gte === now) delete range.gt;
    }
    if (query.dateTo) range.lte = new Date(query.dateTo);
    if (Object.keys(range).length > 0) {
      where.sessions = {
        some: { status: { in: [SessionStatus.OPEN, SessionStatus.FULL] }, startTime: range },
      };
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

    // Public listing never exposes drafts/cancelled workshops: `query.status` may only narrow
    // within the public statuses.
    if (query.status && where.status.in.includes(query.status)) {
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
          sessions: {
            where: { status: { in: [SessionStatus.OPEN, SessionStatus.FULL] }, startTime: { gt: now } },
            orderBy: { startTime: 'asc' },
            take: 20,
          },
        },
      }),
      this.prisma.workshop.count({ where }),
    ]);

    await this.translation.backfill(workshops, ['title', 'description'], (r, b) =>
      this.prisma.workshop.update({ where: { id: r.id }, data: { translations: b.translations as any, sourceLocale: b.sourceLocale } }),
    );

    const data = workshops.map((w) => ({
      ...w,
      sessions: (w.sessions ?? []).map((x) => ({ ...x, remainingSeats: Math.max(x.capacity - x.bookedCount, 0) })),
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
        sessions: { orderBy: { startTime: 'asc' } },
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

    const remainingSeats = Math.max(workshop.capacity - workshop.bookedCount, 0);
    const withSeats = (list: any[]) =>
      list.map((x) => ({ ...x, remainingSeats: Math.max(x.capacity - x.bookedCount, 0) }));

    if (isOwnerOrAdmin) {
      return { ...workshop, sessions: withSeats(workshop.sessions ?? []), remainingSeats };
    }

    // Public view: never expose attendee identities or the business's private
    // fields (KvK number, contact details, subscription).
    const { bookings: _bookings, business, sessions, ...publicWorkshop } = workshop;
    const nowDate = new Date();
    return {
      ...publicWorkshop,
      sessions: withSeats(
        (sessions ?? []).filter((x) => x.status !== SessionStatus.CANCELLED && x.startTime > nowDate),
      ),
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        city: business.city,
        logoAssetId: business.logoAssetId,
      },
      remainingSeats,
    };
  }

  async getBusinessWorkshops(businessId: string, user: any, query: QueryWorkshopDto) {
    await this.verifyBusinessAccess(businessId, user);

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
      include: { business: true, sessions: { where: { status: { not: SessionStatus.CANCELLED } }, orderBy: { startTime: 'asc' } } },
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

    const liveSessions = (workshop as any).sessions ?? [];
    const touchesSchedule = dto.capacity !== undefined || dto.startTime !== undefined || dto.endTime !== undefined;
    if (touchesSchedule && liveSessions.length > 1) {
      throw new BadRequestException('Deze workshop heeft meerdere sessies. Pas tijd en capaciteit per sessie aan.');
    }
    const singleSession = liveSessions.length === 1 ? liveSessions[0] : null;
    const bookedNow = singleSession ? singleSession.bookedCount : workshop.bookedCount;

    if (dto.capacity !== undefined && dto.capacity < bookedNow) {
      throw new BadRequestException(
        `Nieuwe capaciteit (${dto.capacity}) kan niet kleiner zijn dan het aantal geboekte plaatsen (${bookedNow})`,
      );
    }

    if (dto.startTime || dto.endTime) {
      const startTime = dto.startTime ? new Date(dto.startTime) : (singleSession?.startTime ?? workshop.startTime);
      const endTime = dto.endTime ? new Date(dto.endTime) : (singleSession?.endTime ?? workshop.endTime);
      const now = new Date();

      if (startTime <= now) {
        throw new BadRequestException('De starttijd moet in de toekomst liggen');
      }
      if (endTime <= startTime) {
        throw new BadRequestException('De eindtijd moet na de starttijd liggen');
      }
    }

    const textChanged =
      (dto.title !== undefined && dto.title !== workshop.title) ||
      (dto.description !== undefined && dto.description !== workshop.description);
    const i18n = textChanged
      ? await this.translation.translateFields({
          title: dto.title ?? workshop.title,
          description: dto.description !== undefined ? dto.description : workshop.description,
        })
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (singleSession && touchesSchedule) {
        const newCapacity = dto.capacity ?? singleSession.capacity;
        await tx.workshopSession.update({
          where: { id: singleSession.id },
          data: {
            ...(dto.startTime !== undefined ? { startTime: new Date(dto.startTime) } : {}),
            ...(dto.endTime !== undefined ? { endTime: new Date(dto.endTime) } : {}),
            capacity: newCapacity,
            status: singleSession.bookedCount >= newCapacity ? SessionStatus.FULL : SessionStatus.OPEN,
          },
        });
      }
      const w = await tx.workshop.update({
      where: { id: workshopId },
      data: {
        title: dto.title,
        ...(i18n ? { translations: i18n.translations ?? Prisma.DbNull, sourceLocale: i18n.sourceLocale } : {}),
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
        cancellationDeadlineHours: dto.cancellationDeadlineHours !== undefined ? dto.cancellationDeadlineHours : undefined,
        refundPercentage: dto.refundPercentage !== undefined ? dto.refundPercentage : undefined,
        minAge: dto.minAge !== undefined ? dto.minAge : undefined,
        status: dto.status,
      },
      include: {
        business: { select: { id: true, name: true, slug: true, city: true } },
        imageAsset: { select: { id: true, url: true } },
        sessions: { orderBy: { startTime: 'asc' } },
      },
    });
      if (singleSession) await this.syncSummary(tx, workshopId);
      return w;
    });

    if (dto.status === WorkshopStatus.PUBLISHED && workshop.status === WorkshopStatus.FULL && !singleSession) {
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

    const { result, affected, bookingIds } = await this.prisma.$transaction(async (tx) => {
      await tx.workshopSession.updateMany({
        where: { workshopId, status: { not: SessionStatus.COMPLETED } },
        data: { status: SessionStatus.CANCELLED },
      });
      const bookings = await tx.workshopBooking.findMany({
        where: { workshopId, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
        select: { id: true, totalAmount: true, consumerProfile: { select: { userId: true } } },
      });
      const now = new Date();
      for (const b of bookings) {
        const paid = await this.paidAmount(tx, b.id);
        await tx.workshopBooking.update({
          where: { id: b.id },
          data: { status: BookingStatus.CANCELLED, cancelledAt: now, refundPercent: 100, refundAmount: paid },
        });
      }
      await tx.workshop.update({ where: { id: workshopId }, data: { status: WorkshopStatus.CANCELLED, bookedCount: 0 } });

      const full = await tx.workshop.findUnique({
        where: { id: workshopId },
        include: {
          business: { select: { id: true, name: true, slug: true, city: true } },
          imageAsset: { select: { id: true, url: true } },
          sessions: { orderBy: { startTime: 'asc' } },
        },
      });
      return { result: full, affected: bookings.map((b) => b.consumerProfile.userId), bookingIds: bookings.map((b) => b.id) };
    });

    // The organiser cancelled: everything that was paid goes back (full refund).
    await Promise.all(bookingIds.map((id) => this.payments.refundWorkshopBooking(id, 'Workshop geannuleerd door de organisator')));

    // Participants are told after the transaction; failures never undo the cancellation.
    await Promise.all(
      affected.map((userId) =>
        this.notifications.notifyUser(
          userId,
          NotificationType.BOOKING,
          `Workshop geannuleerd: ${workshop.title}`,
          `De workshop "${workshop.title}" is geannuleerd door de organisator. Je krijgt het volledige bedrag terug als je al hebt betaald.`,
          { linkUrl: '/account/orders', email: true },
        ),
      ),
    );
    return result;
  }

  // ==========================================
  // BOOKING CRUD
  // ==========================================

  async createBooking(workshopId: string, user: any, dto: CreateBookingDto) {
    const consumerProfile = await this.getConsumerProfile(user);

    const result = await this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopId },
        include: {
          business: true,
          sessions: { where: { status: { in: [SessionStatus.OPEN, SessionStatus.FULL] }, startTime: { gt: new Date() } }, orderBy: { startTime: 'asc' } },
        },
      });

      if (!workshop) {
        throw new NotFoundException('Workshop niet gevonden');
      }

      if (workshop.status !== WorkshopStatus.PUBLISHED) {
        throw new BadRequestException('Deze workshop is niet beschikbaar voor boekingen');
      }

      const business = workshop.business;
      const hasEntitlement = await this.entitlementService.hasFeature(business.id, 'WORKSHOPS');
      if (!hasEntitlement) {
        throw new ForbiddenException(
          'De winkel heeft geen actief WORKSHOP abonnement',
        );
      }

      if (workshop.minAge && dto.acceptMinAge !== true) {
        throw new BadRequestException(`Bevestig dat alle deelnemers minimaal ${workshop.minAge} jaar zijn`);
      }

      const sessions = workshop.sessions;
      let session = dto.sessionId ? sessions.find((x) => x.id === dto.sessionId) : undefined;
      if (dto.sessionId && !session) {
        throw new BadRequestException('Deze sessie is niet beschikbaar');
      }
      if (!session) {
        const open = sessions.filter((x) => x.status === SessionStatus.OPEN);
        if (sessions.length === 0) {
          throw new BadRequestException('Deze workshop heeft geen komende sessies');
        }
        if (open.length === 1 && sessions.length === 1) session = open[0];
        else if (sessions.length === 1) session = sessions[0];
        else throw new BadRequestException('Kies een sessie');
      }

      const quantity = dto.quantity;
      const rowsAffected = await tx.$executeRaw`
        UPDATE "workshop_sessions"
        SET "booked_count" = "booked_count" + ${quantity}
        WHERE "id" = ${session.id}::uuid AND "status" = 'OPEN' AND ("capacity" - "booked_count") >= ${quantity}
      `;

      if (rowsAffected === 0) {
        throw new ConflictException(
          'Niet genoeg beschikbare plaatsen voor deze sessie',
        );
      }

      if (session.bookedCount + quantity >= session.capacity) {
        await tx.workshopSession.update({ where: { id: session.id }, data: { status: SessionStatus.FULL } });
      }

      const unitPrice = Number(workshop.price);
      const totalAmount = unitPrice * quantity;

      const booking = await tx.workshopBooking.create({
        data: {
          workshopId,
          sessionId: session.id,
          consumerProfileId: consumerProfile.id,
          ticketQuantity: quantity,
          unitPrice,
          totalAmount,
          // Priced bookings hold the seats but are only confirmed once the payment succeeded.
          status: totalAmount > 0 ? BookingStatus.PENDING : BookingStatus.CONFIRMED,
        },
        include: {
          session: { select: { id: true, startTime: true, endTime: true } },
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

      await this.syncSummary(tx, workshopId);
      const refreshed = await tx.workshop.findUnique({ where: { id: workshopId } });
      return { booking, workshop: refreshed ?? workshop };
    });

    // Free bookings are confirmed now; paid ones are announced when the payment succeeds.
    if (result.booking.status === BookingStatus.CONFIRMED) {
      await this.notifyNewBooking(user.id, result.booking, dto.quantity);
    }

    return {
      ...result.booking,
      requiresPayment: result.booking.status === BookingStatus.PENDING,
      workshop: {
        ...result.booking.workshop,
        remainingSeats: Math.max(result.workshop.capacity - result.workshop.bookedCount, 0),
      },
    };
  }

  /** Tells the participant (confirmation) and the shop owner about a new booking. Never throws. */
  private async notifyNewBooking(consumerUserId: string, booking: any, quantity: number) {
    try {
      const title = booking.workshop?.title ?? 'Workshop';
      await this.notifications.notifyUser(
        consumerUserId,
        NotificationType.BOOKING,
        `Boeking bevestigd: ${title}`,
        `Je hebt ${quantity} plaats${quantity === 1 ? '' : 'en'} gereserveerd voor "${title}".`,
        { linkUrl: '/account/orders', email: true },
      );
      const shop = booking.workshop?.business;
      if (shop?.id) {
        const business = await this.prisma.business.findUnique({ where: { id: shop.id }, select: { ownerProfileId: true } });
        const owner = business
          ? await this.prisma.businessOwnerProfile.findUnique({ where: { id: business.ownerProfileId }, select: { userId: true } })
          : null;
        if (owner?.userId) {
          await this.notifications.notifyUser(
            owner.userId,
            NotificationType.BOOKING,
            `Nieuwe boeking: ${title}`,
            `${quantity} plaats${quantity === 1 ? '' : 'en'} geboekt voor "${title}".`,
            { linkUrl: `/owner/workshops/${booking.workshopId}/participants` },
          );
        }
      }
    } catch {
      /* best effort */
    }
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
      include: { workshop: true, session: true },
    });

    if (!booking) {
      throw new NotFoundException('Boeking niet gevonden');
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Alleen actieve boekingen kunnen worden geannuleerd');
    }

    const startsAt = booking.session?.startTime ?? booking.workshop.startTime;
    if (new Date(startsAt) <= new Date()) {
      throw new BadRequestException('De workshop heeft al begonnen en kan niet meer worden geannuleerd');
    }

    let cancelledBy: 'PARTICIPANT' | 'ORGANISER' = 'ORGANISER';
    if (user.role === UserRole.CONSUMER) {
      const consumerProfile = await this.prisma.consumerProfile.findUnique({
        where: { userId: user.id },
      });
      if (!consumerProfile || booking.consumerProfileId !== consumerProfile.id) {
        throw new ForbiddenException('Je kunt alleen je eigen boekingen annuleren');
      }
      cancelledBy = 'PARTICIPANT';
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

    const refundPercent = this.refundPercentFor(booking.workshop, new Date(startsAt), cancelledBy);

    let paidAmount = 0;
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const paid = await this.paidAmount(tx, bookingId);
      paidAmount = paid;
      await tx.workshopBooking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          updatedAt: new Date(),
          cancelledAt: new Date(),
          refundPercent,
          refundAmount: Math.round(paid * refundPercent) / 100,
        },
      });

      if (booking.sessionId) {
        const session = await tx.workshopSession.update({
          where: { id: booking.sessionId },
          data: { bookedCount: { decrement: booking.ticketQuantity } },
        });
        if (session.status === SessionStatus.FULL && session.bookedCount < session.capacity) {
          await tx.workshopSession.update({ where: { id: session.id }, data: { status: SessionStatus.OPEN } });
        }
        await this.syncSummary(tx, booking.workshopId);
      } else {
        // Legacy booking without a session: adjust the workshop counters directly.
        const updatedWorkshop = await tx.workshop.update({
          where: { id: booking.workshopId },
          data: { bookedCount: { decrement: booking.ticketQuantity } },
        });
        if (booking.workshop.status === WorkshopStatus.FULL && updatedWorkshop.bookedCount < updatedWorkshop.capacity) {
          await tx.workshop.update({ where: { id: booking.workshopId }, data: { status: WorkshopStatus.PUBLISHED } });
        }
      }

      return tx.workshopBooking.findUnique({
        where: { id: bookingId },
        include: {
          session: { select: { id: true, startTime: true, endTime: true } },
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

    // Execute the refund the policy grants (nothing when unpaid or after the deadline).
    const refundCents = Math.round(paidAmount * refundPercent);
    const refund =
      refundCents > 0
        ? await this.payments.refundWorkshopBooking(bookingId, cancelledBy === 'PARTICIPANT' ? 'Annulering door deelnemer' : 'Annulering door de organisator', cancelledBy === 'ORGANISER' ? undefined : refundCents)
        : { status: 'NOT_REQUIRED' as const, refundedCents: 0 };
    return { ...cancelled, refund };
  }

  /**
   * Releases the seats of priced bookings whose payment did not arrive within
   * UNPAID_HOLD_MINUTES. The provider is asked first so a payment that just
   * succeeded is never cancelled; a payment that still arrives later is refunded.
   */
  async expireUnpaidBookings(now = new Date()): Promise<{ checked: number; released: number }> {
    const cutoff = new Date(now.getTime() - UNPAID_HOLD_MINUTES * 60 * 1000);
    const stale = await this.prisma.workshopBooking.findMany({
      where: { status: BookingStatus.PENDING, totalAmount: { gt: 0 }, createdAt: { lt: cutoff } },
      include: { workshop: { select: { status: true } }, payments: { select: { providerTransactionId: true, status: true } } },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    let released = 0;
    for (const booking of stale) {
      try {
        const open = [...new Set(booking.payments.filter((p) => p.providerTransactionId && (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.AUTHORIZED)).map((p) => p.providerTransactionId as string))];
        for (const id of open) await this.payments.syncFromProvider(id);

        const didRelease = await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.workshopBooking.updateMany({
            where: { id: booking.id, status: BookingStatus.PENDING },
            data: { status: BookingStatus.CANCELLED, cancelledAt: now, refundPercent: 0, refundAmount: 0 },
          });
          if (claimed.count === 0) return false;
          if (booking.sessionId) {
            const session = await tx.workshopSession.update({
              where: { id: booking.sessionId },
              data: { bookedCount: { decrement: booking.ticketQuantity } },
            });
            if (session.status === SessionStatus.FULL && session.bookedCount < session.capacity) {
              await tx.workshopSession.update({ where: { id: session.id }, data: { status: SessionStatus.OPEN } });
            }
            await this.syncSummary(tx, booking.workshopId);
          } else {
            const updatedWorkshop = await tx.workshop.update({
              where: { id: booking.workshopId },
              data: { bookedCount: { decrement: booking.ticketQuantity } },
            });
            if (booking.workshop.status === WorkshopStatus.FULL && updatedWorkshop.bookedCount < updatedWorkshop.capacity) {
              await tx.workshop.update({ where: { id: booking.workshopId }, data: { status: WorkshopStatus.PUBLISHED } });
            }
          }
          return true;
        });
        if (didRelease) released += 1;
      } catch {
        /* one failing booking must not stop the run */
      }
    }
    return { checked: stale.length, released };
  }

  // ==========================================
  // SESSIONS & PARTICIPANTS (owner)
  // ==========================================

  private async loadOwnedWorkshop(workshopId: string, user: any) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop || (workshop as any).deletedAt) throw new NotFoundException('Workshop niet gevonden');
    await this.verifyBusinessOwnership(workshop.businessId, user);
    return workshop;
  }

  /** Participant lists are open to the shop's owner, admins and active employees. */
  private async loadWorkshopForStaff(workshopId: string, user: any) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop || (workshop as any).deletedAt) throw new NotFoundException('Workshop niet gevonden');
    await this.verifyBusinessAccess(workshop.businessId, user);
    return workshop;
  }

  /** Read access: owner, admin or an active employee of the shop. */
  private async verifyBusinessAccess(businessId: string, user: any) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business || business.deletedAt) throw new NotFoundException('Winkel niet gevonden');
    if (user.role === UserRole.SUPER_ADMIN) return business;
    if (user.role === UserRole.BUSINESS_OWNER) {
      const ownerProfile = await this.prisma.businessOwnerProfile.findUnique({ where: { userId: user.id } });
      if (ownerProfile && business.ownerProfileId === ownerProfile.id) return business;
    }
    if (await this.employees.isActiveStaff(user.id, businessId)) return business;
    throw new ForbiddenException('Je bent niet gemachtigd om workshops voor deze winkel te bekijken');
  }

  async addSession(workshopId: string, user: any, dto: { startTime: string; endTime: string; capacity?: number }) {
    const workshop = await this.loadOwnedWorkshop(workshopId, user);
    if (workshop.status === WorkshopStatus.CANCELLED) {
      throw new BadRequestException('Een geannuleerde workshop kan geen nieuwe sessies krijgen');
    }
    const [input] = this.parseSessions({ sessions: [dto], capacity: dto.capacity ?? workshop.capacity });
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.workshopSession.count({ where: { workshopId, status: { not: SessionStatus.CANCELLED } } });
      if (count >= 30) throw new BadRequestException('Maximaal 30 sessies per workshop');
      const clash = await tx.workshopSession.findFirst({
        where: { workshopId, startTime: input.startTime, status: { not: SessionStatus.CANCELLED } },
      });
      if (clash) throw new BadRequestException('Twee sessies kunnen niet op hetzelfde tijdstip starten');
      const created = await tx.workshopSession.create({ data: { workshopId, ...input } });
      await this.syncSummary(tx, workshopId);
      return created;
    });
  }

  async updateSession(
    workshopId: string,
    sessionId: string,
    user: any,
    dto: { startTime?: string; endTime?: string; capacity?: number },
  ) {
    const workshop = await this.loadOwnedWorkshop(workshopId, user);
    const session = await this.prisma.workshopSession.findFirst({ where: { id: sessionId, workshopId } });
    if (!session) throw new NotFoundException('Sessie niet gevonden');
    if (session.status === SessionStatus.CANCELLED || session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Deze sessie kan niet meer worden aangepast');
    }
    const start = dto.startTime ? new Date(dto.startTime) : session.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : session.endTime;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('Ongeldige datum of tijd');
    if (start <= new Date()) throw new BadRequestException('De starttijd moet in de toekomst liggen');
    if (end <= start) throw new BadRequestException('De eindtijd moet na de starttijd liggen');
    const capacity = dto.capacity ?? session.capacity;
    if (capacity < session.bookedCount) {
      throw new BadRequestException(
        `Nieuwe capaciteit (${capacity}) kan niet kleiner zijn dan het aantal geboekte plaatsen (${session.bookedCount})`,
      );
    }
    const rescheduled = start.getTime() !== session.startTime.getTime() || end.getTime() !== session.endTime.getTime();

    const { updated, affected } = await this.prisma.$transaction(async (tx) => {
      const u = await tx.workshopSession.update({
        where: { id: sessionId },
        data: {
          startTime: start,
          endTime: end,
          capacity,
          status: session.bookedCount >= capacity ? SessionStatus.FULL : SessionStatus.OPEN,
        },
      });
      await this.syncSummary(tx, workshopId);
      const bookings = rescheduled
        ? await tx.workshopBooking.findMany({
            where: { sessionId, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
            select: { consumerProfile: { select: { userId: true } } },
          })
        : [];
      return { updated: u, affected: bookings.map((b) => b.consumerProfile.userId) };
    });

    await Promise.all(
      affected.map((userId) =>
        this.notifications.notifyUser(
          userId,
          NotificationType.BOOKING,
          `Nieuwe tijd voor workshop: ${workshop.title}`,
          `De sessie van "${workshop.title}" is verplaatst. Controleer de nieuwe tijd in je boeking. Past het niet, dan kun je kosteloos annuleren.`,
          { linkUrl: '/account/orders', email: true },
        ),
      ),
    );
    return updated;
  }

  async cancelSession(workshopId: string, sessionId: string, user: any) {
    const workshop = await this.loadOwnedWorkshop(workshopId, user);
    const session = await this.prisma.workshopSession.findFirst({ where: { id: sessionId, workshopId } });
    if (!session) throw new NotFoundException('Sessie niet gevonden');
    if (session.status === SessionStatus.CANCELLED) return session;
    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Een afgelopen sessie kan niet worden geannuleerd');
    }

    const { cancelled, affected, bookingIds } = await this.prisma.$transaction(async (tx) => {
      const c = await tx.workshopSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.CANCELLED, bookedCount: 0 },
      });
      const bookings = await tx.workshopBooking.findMany({
        where: { sessionId, status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] } },
        select: { id: true, consumerProfile: { select: { userId: true } } },
      });
      const now = new Date();
      for (const b of bookings) {
        const paid = await this.paidAmount(tx, b.id);
        await tx.workshopBooking.update({
          where: { id: b.id },
          data: { status: BookingStatus.CANCELLED, cancelledAt: now, refundPercent: 100, refundAmount: paid },
        });
      }
      await this.syncSummary(tx, workshopId);
      return { cancelled: c, affected: bookings.map((b) => b.consumerProfile.userId), bookingIds: bookings.map((b) => b.id) };
    });

    await Promise.all(bookingIds.map((id) => this.payments.refundWorkshopBooking(id, 'Sessie geannuleerd door de organisator')));

    await Promise.all(
      affected.map((userId) =>
        this.notifications.notifyUser(
          userId,
          NotificationType.BOOKING,
          `Sessie geannuleerd: ${workshop.title}`,
          `Een sessie van "${workshop.title}" is geannuleerd door de organisator. Je krijgt het volledige bedrag terug als je al hebt betaald.`,
          { linkUrl: '/account/orders', email: true },
        ),
      ),
    );
    return cancelled;
  }

  /** Attendee list for the workshop's organiser (optionally one session). */
  async getParticipants(workshopId: string, user: any, sessionId?: string) {
    const workshop = await this.loadWorkshopForStaff(workshopId, user);
    const bookings = await this.prisma.workshopBooking.findMany({
      where: {
        workshopId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        ...(sessionId ? { sessionId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        session: { select: { id: true, startTime: true, endTime: true } },
        consumerProfile: { select: { id: true, displayName: true, firstName: true, lastName: true, phone: true } },
      },
    });
    return {
      workshop: { id: workshop.id, title: workshop.title, minAge: workshop.minAge },
      data: bookings.map((b) => ({
        bookingId: b.id,
        name:
          [b.consumerProfile.firstName, b.consumerProfile.lastName].filter(Boolean).join(' ') ||
          b.consumerProfile.displayName ||
          '',
        phone: b.consumerProfile.phone ?? null,
        tickets: b.ticketQuantity,
        total: Number(b.totalAmount),
        status: b.status,
        sessionId: b.sessionId,
        sessionStart: b.session?.startTime ?? null,
        bookedAt: b.createdAt,
      })),
    };
  }

  async getParticipantsCsv(workshopId: string, user: any, sessionId?: string): Promise<string> {
    const { data } = await this.getParticipants(workshopId, user, sessionId);
    const esc = (v: unknown) => {
      let t = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
      // Neutralise spreadsheet formula injection from user-controlled names.
      if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const header = ['Naam', 'Telefoon', 'Tickets', 'Totaal', 'Status', 'Sessie', 'Geboekt op'];
    const rows = data.map((r) => [r.name, r.phone, r.tickets, r.total, r.status, r.sessionStart, r.bookedAt].map(esc).join(','));
    return [header.map(esc).join(','), ...rows].join('\n');
  }

  // ==========================================
  // SESSIONS & POLICY HELPERS
  // ==========================================

  /** Validates the requested sessions (or the single start/end pair) and returns them sorted by start. */
  private parseSessions(dto: { sessions?: { startTime: string; endTime: string; capacity?: number }[]; startTime?: string; endTime?: string; capacity: number }) {
    const raw = dto.sessions?.length
      ? dto.sessions
      : dto.startTime && dto.endTime
        ? [{ startTime: dto.startTime, endTime: dto.endTime, capacity: dto.capacity }]
        : [];
    if (raw.length === 0) {
      throw new BadRequestException('Geef een start- en eindtijd op, of voeg minstens één sessie toe');
    }
    const now = new Date();
    const parsed = raw.map((r) => ({
      startTime: new Date(r.startTime),
      endTime: new Date(r.endTime),
      capacity: r.capacity ?? dto.capacity,
    }));
    for (const x of parsed) {
      if (Number.isNaN(x.startTime.getTime()) || Number.isNaN(x.endTime.getTime())) {
        throw new BadRequestException('Ongeldige datum of tijd');
      }
      if (x.startTime <= now) throw new BadRequestException('De starttijd moet in de toekomst liggen');
      if (x.endTime <= x.startTime) throw new BadRequestException('De eindtijd moet na de starttijd liggen');
    }
    parsed.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i].startTime.getTime() === parsed[i - 1].startTime.getTime()) {
        throw new BadRequestException('Twee sessies kunnen niet op hetzelfde tijdstip starten');
      }
    }
    return parsed;
  }

  /**
   * Keeps the workshop's summary columns (earliest upcoming session, total seats and bookings,
   * FULL/PUBLISHED/CANCELLED) in line with its sessions. Call inside the transaction that changed them.
   */
  private async syncSummary(tx: Prisma.TransactionClient, workshopId: string) {
    const workshop = await tx.workshop.findUnique({ where: { id: workshopId }, select: { status: true } });
    if (!workshop) return;
    const all = await tx.workshopSession.findMany({ where: { workshopId }, orderBy: { startTime: 'asc' } });
    if (all.length === 0) return; // legacy workshop without sessions
    const live = all.filter((x) => x.status !== SessionStatus.CANCELLED);
    if (live.length === 0) {
      await tx.workshop.update({ where: { id: workshopId }, data: { status: WorkshopStatus.CANCELLED, bookedCount: 0 } });
      return;
    }
    const now = new Date();
    const upcoming = live.filter((x) => x.startTime > now);
    const shown = upcoming[0] ?? live[live.length - 1];
    let status = workshop.status;
    if (status === WorkshopStatus.PUBLISHED || status === WorkshopStatus.FULL) {
      const open = upcoming.filter((x) => x.status === SessionStatus.OPEN);
      status = upcoming.length > 0 && open.length === 0 ? WorkshopStatus.FULL : WorkshopStatus.PUBLISHED;
    }
    await tx.workshop.update({
      where: { id: workshopId },
      data: {
        startTime: shown.startTime,
        endTime: shown.endTime,
        capacity: live.reduce((n, x) => n + x.capacity, 0),
        bookedCount: live.reduce((n, x) => n + x.bookedCount, 0),
        status,
      },
    });
  }

  /** Share of the price owed back when a booking is cancelled, per the workshop's policy. */
  refundPercentFor(
    workshop: { cancellationDeadlineHours: number; refundPercentage: number },
    sessionStart: Date,
    cancelledBy: 'PARTICIPANT' | 'ORGANISER',
    now = new Date(),
  ): number {
    if (cancelledBy === 'ORGANISER') return 100;
    const hoursBefore = (sessionStart.getTime() - now.getTime()) / 3_600_000;
    return hoursBefore >= workshop.cancellationDeadlineHours ? workshop.refundPercentage : 0;
  }

  private async paidAmount(tx: Prisma.TransactionClient, bookingId: string): Promise<number> {
    const payments = await tx.payment.findMany({
      where: { workshopBookingId: bookingId, status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } },
      select: { amount: true },
    });
    return payments.reduce((n, p) => n + Number(p.amount), 0);
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
