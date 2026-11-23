import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { PayoutsService } from './payouts.service';

@ApiTags('Internal jobs')
@Controller('internal/jobs')
export class PayoutsJobsController {
  constructor(private readonly payouts: PayoutsService) {}

  /** Vercel Cron calls GET (with Authorization: Bearer CRON_SECRET); same job as the POST below. */
  @Get('weekly-payouts')
  @UseGuards(CronSecretGuard)
  cron() {
    return this.run();
  }

  @Post('weekly-payouts')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CronSecretGuard)
  @ApiOperation({ summary: 'Create the weekly payouts (weekly, e.g. Monday morning)' })
  run() {
    return this.payouts.runWeekly();
  }
}
