import { Module } from '@nestjs/common';
import { FollowersService } from './followers.service';
import { FollowersController } from './followers.controller';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';

@Module({
  controllers: [FollowersController],
  providers: [
    FollowersService,
    SubscriptionEntitlementService,
  ],
  exports: [FollowersService],
})
export class FollowersModule {}