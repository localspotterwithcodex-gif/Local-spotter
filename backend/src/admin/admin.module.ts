import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminController } from './admin.controller';
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { PaymentsModule } from '../payments/payments.module';
import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminReportsService } from './reports/admin-reports.service';

@Module({
  imports: [PaymentsModule],
  controllers: [AdminController, AdminCategoriesController, AdminPlansController, AdminReportsController],
  providers: [AdminService, AdminCategoriesService, AdminPlansService, AdminAnalyticsService, AdminReportsService],
  exports: [AdminService],
})
export class AdminModule {}
