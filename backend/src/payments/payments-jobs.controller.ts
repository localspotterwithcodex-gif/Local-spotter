import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { PaymentsService } from './payments.service';

/** Called by an external scheduler with the x-cron-secret header (see CronSecretGuard). */
@ApiTags('Internal jobs')
@Controller('internal/jobs')
@UseGuards(CronSecretGuard)
export class PaymentsJobsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('expire-unpaid-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel orders whose payment was not completed in time and release their stock' })
  expire() {
    return this.payments.expireUnpaidCheckouts();
  }
}
