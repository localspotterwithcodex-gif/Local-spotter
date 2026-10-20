import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { NotificationsService } from './notifications.service';

/** Called by an external scheduler with the x-cron-secret header (see CronSecretGuard). */
@ApiTags('Internal jobs')
@Controller('internal/jobs')
@UseGuards(CronSecretGuard)
export class NotificationsJobsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('subscription-reminders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remind owners whose subscription ends within 7 days (once per period)' })
  reminders() {
    return this.notifications.sendSubscriptionExpiryReminders();
  }
}
