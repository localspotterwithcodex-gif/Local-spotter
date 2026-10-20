import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { PayoutsService } from './payouts.service';

@ApiTags('Internal jobs')
@Controller('internal/jobs')
export class PayoutsJobsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('weekly-payouts')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CronSecretGuard)
  @ApiOperation({ summary: 'Create the weekly payouts (weekly, e.g. Monday morning)' })
  run() {
    return this.payouts.runWeekly();
  }
}
