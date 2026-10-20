import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionEntitlementService } from './subscription-entitlement.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  providers: [SubscriptionsService, SubscriptionEntitlementService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, SubscriptionEntitlementService],
})
export class SubscriptionsModule {}
