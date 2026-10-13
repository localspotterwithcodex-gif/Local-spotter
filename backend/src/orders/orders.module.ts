import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [SubscriptionsModule, CartModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
