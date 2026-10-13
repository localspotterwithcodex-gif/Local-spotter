import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewStatus } from '@prisma/client';
import { ConsumerProfile } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private entitlementService: SubscriptionEntitlementService,
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
    const where = business.ownerProfile.userId === user.id
      ? {} // Owner sees all
      : { status: ReviewStatus.PUBLISHED }; // Consumers only see published

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
}