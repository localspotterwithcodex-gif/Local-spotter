import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopRegistrationsController } from './shop-registrations.controller';
import { ShopRegistrationsService } from './shop-registrations.service';

@Module({
  controllers: [ShopRegistrationsController],
  providers: [ShopRegistrationsService, PrismaService],
  exports: [ShopRegistrationsService],
})
export class ShopRegistrationsModule {}
