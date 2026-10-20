import { Module } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';
import { WorkshopsController } from './workshops.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmployeesModule } from '../employees/employees.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { WorkshopsJobsController } from './workshops-jobs.controller';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';

@Module({
  imports: [SubscriptionsModule, NotificationsModule, EmployeesModule, PaymentsModule],
  providers: [WorkshopsService, CronSecretGuard],
  controllers: [WorkshopsController, WorkshopsJobsController],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
