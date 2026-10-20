import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { EmployeesModule } from '../employees/employees.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaService } from '../prisma/prisma.service';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

@Module({
  imports: [NotificationsModule, EmployeesModule, PaymentsModule],
  controllers: [ReturnsController],
  providers: [ReturnsService, PrismaService, RateLimitGuard],
  exports: [ReturnsService],
})
export class ReturnsModule {}
