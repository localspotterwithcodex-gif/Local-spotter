import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminController } from './admin.controller';
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';

@Module({
  controllers: [AdminController, AdminCategoriesController, AdminPlansController],
  providers: [AdminService, AdminCategoriesService, AdminPlansService, AdminAnalyticsService],
  exports: [AdminService],
})
export class AdminModule {}
