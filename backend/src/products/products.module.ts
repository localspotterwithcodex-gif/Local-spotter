import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { FavoritesModule } from '../favorites/favorites.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule, FavoritesModule],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
