import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { GuestService } from './guest.service';

@ApiTags('Internal jobs')
@Controller('internal/jobs')
export class GuestJobsController {
  constructor(private readonly guest: GuestService) {}

  /** Vercel Cron calls GET (with Authorization: Bearer CRON_SECRET); same job as the POST below. */
  @Get('cleanup-guests')
  @UseGuards(CronSecretGuard)
  cron() {
    return this.cleanup();
  }

  @Post('cleanup-guests')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CronSecretGuard)
  @ApiOperation({ summary: 'Remove guest accounts that never completed a checkout (daily)' })
  cleanup() {
    return this.guest.cleanupIdleGuests();
  }
}
