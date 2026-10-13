import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';

@Module({
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    PrismaService,
    SubscriptionEntitlementService,
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}