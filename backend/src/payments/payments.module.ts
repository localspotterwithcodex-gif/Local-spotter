import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsJobsController } from './payments-jobs.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_GATEWAY, UnconfiguredPaymentGateway } from './payment-gateway';
import { StripeGateway } from './stripe.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController, PaymentsWebhookController, PaymentsJobsController],
  providers: [
    PaymentsService,
    PrismaService,
    CronSecretGuard,
    StripeGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, StripeGateway],
      useFactory: (config: ConfigService, stripe: StripeGateway) =>
        config.get<string>('STRIPE_SECRET_KEY')?.trim() ? stripe : new UnconfiguredPaymentGateway(),
    },
  ],
  exports: [PaymentsService, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
