import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, PrismaService, RateLimitGuard],
  exports: [EmployeesService],
})
export class EmployeesModule {}
