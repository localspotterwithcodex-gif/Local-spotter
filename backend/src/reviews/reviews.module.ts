import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    PrismaService,
    SubscriptionEntitlementService,
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}