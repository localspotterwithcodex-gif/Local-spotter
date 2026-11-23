import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { Module } from '@nestjs/common';
import { ShopRegistrationsController } from './shop-registrations.controller';
import { ShopRegistrationsService } from './shop-registrations.service';

@Module({
  controllers: [ShopRegistrationsController],
  providers: [ShopRegistrationsService, RateLimitGuard],
  exports: [ShopRegistrationsService],
})
export class ShopRegistrationsModule {}
