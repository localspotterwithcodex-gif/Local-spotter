import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { PaymentsService } from './payments.service';

/** Called by an external scheduler with the x-cron-secret header (see CronSecretGuard). */
@ApiTags('Internal jobs')
@Controller('internal/jobs')
@UseGuards(CronSecretGuard)
export class PaymentsJobsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Vercel Cron calls GET (with Authorization: Bearer CRON_SECRET); same job as the POST below. */
  @Get('expire-unpaid-orders')
  @UseGuards(CronSecretGuard)
  cron() {
    return this.expire();
  }

  @Post('expire-unpaid-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel orders whose payment was not completed in time and release their stock' })
  expire() {
    return this.payments.expireUnpaidCheckouts();
  }
}
