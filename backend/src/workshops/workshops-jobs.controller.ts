import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { WorkshopsService } from './workshops.service';

/** Called by an external scheduler with the x-cron-secret header (see CronSecretGuard). */
@ApiTags('Internal jobs')
@Controller('internal/jobs')
@UseGuards(CronSecretGuard)
export class WorkshopsJobsController {
  constructor(private readonly workshops: WorkshopsService) {}

  @Post('expire-unpaid-bookings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release seats of workshop bookings that were not paid in time' })
  expire() {
    return this.workshops.expireUnpaidBookings();
  }
}
