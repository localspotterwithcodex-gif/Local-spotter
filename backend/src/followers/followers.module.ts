import { Module } from '@nestjs/common';
import { FollowersService } from './followers.service';
import { FollowersController } from './followers.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';

@Module({
  controllers: [FollowersController],
  providers: [
    FollowersService,
    PrismaService,
    SubscriptionEntitlementService,
  ],
  exports: [FollowersService],
})
export class FollowersModule {}