import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { ShopRoutesModule } from './shoproutes/shoproutes.module';
import { FollowersModule } from './followers/followers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { ShopRegistrationsModule } from './shop-registrations/shop-registrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    SubscriptionsModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    WorkshopsModule,
    ShopRoutesModule,
    FollowersModule,
    NotificationsModule,
    PaymentsModule,
    AdminModule,
    ShopRegistrationsModule,
  ],
})
export class AppModule {}
