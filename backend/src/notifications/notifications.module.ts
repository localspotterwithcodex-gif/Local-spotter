import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsJobsController } from './notifications-jobs.controller';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GuestModule } from '../guest/guest.module';

@Module({
  imports: [GuestModule],
  controllers: [NotificationsController, NotificationsJobsController],
  providers: [
    NotificationsService,
    PrismaService,
    CronSecretGuard,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
