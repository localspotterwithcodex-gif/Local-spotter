import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsJobsController } from './payments-jobs.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_GATEWAY, UnconfiguredPaymentGateway } from './payment-gateway';
import { MollieGateway } from './mollie.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController, PaymentsWebhookController, PaymentsJobsController],
  providers: [
    PaymentsService,
    PrismaService,
    CronSecretGuard,
    MollieGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, MollieGateway],
      useFactory: (config: ConfigService, mollie: MollieGateway) =>
        config.get<string>('MOLLIE_API_KEY')?.trim() ? mollie : new UnconfiguredPaymentGateway(),
    },
  ],
  exports: [PaymentsService, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
