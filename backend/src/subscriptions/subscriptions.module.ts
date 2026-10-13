import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionEntitlementService } from './subscription-entitlement.service';
import { SubscriptionsController } from './subscriptions.controller';

@Module({
  providers: [SubscriptionsService, SubscriptionEntitlementService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, SubscriptionEntitlementService],
})
export class SubscriptionsModule {}
