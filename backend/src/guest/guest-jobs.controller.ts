import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { GuestService } from './guest.service';

@ApiTags('Internal jobs')
@Controller('internal/jobs')
export class GuestJobsController {
  constructor(private readonly guest: GuestService) {}

  @Post('cleanup-guests')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CronSecretGuard)
  @ApiOperation({ summary: 'Remove guest accounts that never completed a checkout (daily)' })
  cleanup() {
    return this.guest.cleanupIdleGuests();
  }
}
