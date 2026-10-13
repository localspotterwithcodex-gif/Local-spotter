import { Module } from '@nestjs/common';
import { ShopRoutesService } from './shoproutes.service';
import { ShopRoutesController } from './shoproutes.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  providers: [ShopRoutesService],
  controllers: [ShopRoutesController],
  exports: [ShopRoutesService],
})
export class ShopRoutesModule {}
