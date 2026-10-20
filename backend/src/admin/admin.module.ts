import { Module } from '@nestjs/common';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminController } from './admin.controller';
import { AdminPlansController } from './admin-plans.controller';
import { AdminPlansService } from './admin-plans.service';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, AdminCategoriesController, AdminPlansController],
  providers: [AdminService, AdminCategoriesService, AdminPlansService],
  exports: [AdminService],
})
export class AdminModule {}
