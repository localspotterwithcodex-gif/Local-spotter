import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatus } from '@prisma/client';
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
    // Check Workshop entitlement for review creation
    const hasFeature = await this.entitlementService.hasFeature(
      businessId,
      'WORKSHOPS',
    );
    if (!hasFeature) {
      throw new ForbiddenException(
        'Je hebt een WORKSHOP-abonnement nodig om reviews te plaatsen',
      );
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        businessId,
        consumerProfileId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        status: ReviewStatus.PENDING, // Initial status for moderation
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
}
