import { Module } from '@nestjs/common';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PayoutAccountController } from './payout-account.controller';
import { PayoutAccountService } from './payout-account.service';
import { PayoutsAdminController } from './payouts-admin.controller';
import { PayoutsJobsController } from './payouts-jobs.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [NotificationsModule],
  controllers: [FinanceController, PayoutAccountController, PayoutsAdminController, PayoutsJobsController],
  providers: [FinanceService, PayoutsService, PayoutAccountService, PrismaService, RateLimitGuard, CronSecretGuard],
  exports: [FinanceService, PayoutsService],
})
export class FinanceModule {}
