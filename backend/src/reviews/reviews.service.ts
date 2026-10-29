import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingStatus, OrderStatus, ReviewStatus } from '@prisma/client';
import { ConsumerProfile } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
    private notifications: NotificationsService,
  ) {}

  async createReview(
    businessId: string,
    consumerProfileId: string,
    dto: CreateReviewDto,
  ) {
    if (dto.orderId && dto.workshopId) {
      throw new BadRequestException('Kies één bestelling of één workshop om te beoordelen');
    }
    const verified = await this.verifyExperience(businessId, consumerProfileId, dto);

    if (!verified) {
      // Free-standing review (no delivered order / attended workshop): needs the shop's WORKSHOPS feature
      // and a title + text, and goes through moderation.
      const hasFeature = await this.entitlementService.hasFeature(businessId, 'WORKSHOPS');
      if (!hasFeature) {
        throw new ForbiddenException('Je hebt een WORKSHOP-abonnement nodig om reviews te plaatsen');
      }
      if (!dto.title?.trim() || !dto.comment?.trim()) {
        throw new BadRequestException('Titel en review zijn verplicht');
      }
    }

    const review = await this.prisma.review.create({
      data: {
        businessId,
        consumerProfileId,
        orderId: dto.orderId ?? null,
        workshopId: dto.workshopId ?? null,
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment?.trim() ?? '',
        // A review after a real delivery / attended workshop is published straight away.
        status: verified ? ReviewStatus.PUBLISHED : ReviewStatus.PENDING,
      },
      include: {
        business: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    await this.notifications.notifyBusinessOwner(
      businessId,
      'REVIEW',
      'Nieuwe review',
      `Je winkel kreeg een review van ${dto.rating} ${dto.rating === 1 ? 'ster' : 'sterren'}.`,
      '/owner',
    );

    return review;
  }

  async getBusinessReviews(
    businessId: string,
    user: any,
  ) {
    // Check if user has permission to view reviews
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { ownerProfile: true },
    });

    if (!business) {
      throw new NotFoundException('Bedrijf niet gevonden');
    }

    // Business owner can see all reviews, consumers can see published reviews
    // Only the owning user or a super admin may see unpublished reviews; everyone
    // else gets published ones. Always scoped to THIS business.
    const canSeeAll = user?.role === 'SUPER_ADMIN' || business.ownerProfile.userId === user?.id;
    if (user?.role === 'BUSINESS_OWNER' && !canSeeAll) {
      throw new ForbiddenException('Geen toegang tot reviews van dit bedrijf');
    }
    const where = canSeeAll
      ? { businessId }
      : { businessId, status: ReviewStatus.PUBLISHED };

    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        consumerProfile: {
          select: { id: true, displayName: true, firstName: true, lastName: true },
        },
        business: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get rating aggregation
    const allReviews = await this.prisma.review.findMany({
      where: { businessId, status: ReviewStatus.PUBLISHED },
    });

    const ratingCount = allReviews.length;
    const averageRating = ratingCount > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0;

    const ratingDistribution: Record<string, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[String(i)] = allReviews.filter(r => r.rating === i).length;
    }

    return {
      reviews,
      aggregation: {
        averageRating: Math.round(averageRating * 10) / 10,
        ratingCount,
        ratingDistribution,
      },
    };
  }

  /** Public read: published reviews only, no authentication required. */
  async getPublicBusinessReviews(businessId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { businessId, status: ReviewStatus.PUBLISHED, deletedAt: null },
      include: {
        consumerProfile: { select: { id: true, displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const ratingCount = reviews.length;
    const averageRating = ratingCount ? reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount : 0;
    return {
      reviews,
      aggregation: { averageRating: Math.round(averageRating * 10) / 10, ratingCount },
    };
  }

  /** The signed-in consumer's own reviews (any moderation status). */
  async getConsumerReviews(consumerProfileId: string) {
    return this.prisma.review.findMany({
      where: { consumerProfileId, deletedAt: null },
      include: { business: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * A review is "verified" when it points at a delivered order or an attended workshop of this customer in this
   * shop, and that experience has not been reviewed yet. Throws on a mismatch or a duplicate.
   */
  private async verifyExperience(businessId: string, consumerProfileId: string, dto: CreateReviewDto): Promise<boolean> {
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        select: { consumerProfileId: true, businessId: true, status: true },
      });
      if (!order || order.consumerProfileId !== consumerProfileId || order.businessId !== businessId) {
        throw new NotFoundException('Bestelling niet gevonden');
      }
      if (order.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException('Je kunt pas beoordelen nadat de bestelling is afgeleverd');
      }
      const existing = await this.prisma.review.count({ where: { orderId: dto.orderId, consumerProfileId, deletedAt: null } });
      if (existing > 0) throw new ConflictException('Je hebt deze bestelling al beoordeeld');
      return true;
    }
    if (dto.workshopId) {
      const booking = await this.prisma.workshopBooking.findFirst({
        where: {
          workshopId: dto.workshopId,
          consumerProfileId,
          workshop: { businessId },
          ...this.attendedFilter(),
        },
        select: { id: true },
      });
      if (!booking) throw new BadRequestException('Je kunt een workshop pas beoordelen nadat je eraan hebt deelgenomen');
      const existing = await this.prisma.review.count({ where: { workshopId: dto.workshopId, consumerProfileId, deletedAt: null } });
      if (existing > 0) throw new ConflictException('Je hebt deze workshop al beoordeeld');
      return true;
    }
    return false;
  }

  private attendedFilter() {
    return {
      OR: [
        { status: BookingStatus.COMPLETED },
        { status: BookingStatus.CONFIRMED, session: { endTime: { lt: new Date() } } },
      ],
    };
  }

  /** Delivered orders and attended workshops the customer has not reviewed yet ("review later" reminders). */
  async getReviewable(consumerProfileId: string) {
    const [orders, bookings, reviews] = await Promise.all([
      this.prisma.order.findMany({
        where: { consumerProfileId, status: OrderStatus.DELIVERED, consumerHiddenAt: null },
        orderBy: { deliveredAt: 'desc' },
        take: 20,
        select: { id: true, orderNumber: true, deliveredAt: true, createdAt: true, business: { select: { id: true, name: true } } },
      }),
      this.prisma.workshopBooking.findMany({
        where: { consumerProfileId, ...this.attendedFilter() },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, updatedAt: true, workshop: { select: { id: true, title: true, business: { select: { id: true, name: true } } } } },
      }),
      this.prisma.review.findMany({
        where: { consumerProfileId, deletedAt: null, OR: [{ orderId: { not: null } }, { workshopId: { not: null } }] },
        select: { orderId: true, workshopId: true },
      }),
    ]);
    const reviewedOrders = new Set(reviews.map((r) => r.orderId).filter(Boolean));
    const reviewedWorkshops = new Set(reviews.map((r) => r.workshopId).filter(Boolean));
    const seenWorkshops = new Set<string>();
    const items = [
      ...orders
        .filter((o) => !reviewedOrders.has(o.id))
        .map((o) => ({
          kind: 'order' as const,
          id: o.id,
          label: o.orderNumber,
          businessId: o.business.id,
          businessName: o.business.name,
          date: o.deliveredAt ?? o.createdAt,
        })),
      ...bookings
        .filter((b) => {
          if (reviewedWorkshops.has(b.workshop.id) || seenWorkshops.has(b.workshop.id)) return false;
          seenWorkshops.add(b.workshop.id);
          return true;
        })
        .map((b) => ({
          kind: 'workshop' as const,
          id: b.workshop.id,
          label: b.workshop.title,
          businessId: b.workshop.business.id,
          businessName: b.workshop.business.name,
          date: b.updatedAt,
        })),
    ];
    items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return { items };
  }

  /** The customer deletes their own review (soft delete). Ratings are computed from live reviews, so they update at once. */
  async deleteOwnReview(reviewId: string, consumerProfileId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId }, select: { consumerProfileId: true, deletedAt: true } });
    if (!review || review.deletedAt || review.consumerProfileId !== consumerProfileId) {
      throw new NotFoundException('Review niet gevonden');
    }
    await this.prisma.review.update({ where: { id: reviewId }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
