import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { SubscriptionEntitlementService } from '../subscriptions/subscription-entitlement.service';

@Module({
  providers: [BusinessesService, SubscriptionEntitlementService],
  controllers: [BusinessesController],
  exports: [BusinessesService],
})
export class BusinessesModule {}
