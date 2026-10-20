import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CartModule } from '../cart/cart.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeesModule } from '../employees/employees.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [SubscriptionsModule, CartModule, NotificationsModule, EmployeesModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
