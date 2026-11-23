import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, RateLimitGuard],
  exports: [EmployeesService],
})
export class EmployeesModule {}
