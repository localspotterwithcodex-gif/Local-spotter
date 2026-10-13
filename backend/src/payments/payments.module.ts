import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_GATEWAY, UnconfiguredPaymentGateway } from './payment-gateway';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PrismaService,
    // Swap for the real PSP adapter once the provider decision (D-004) is made.
    { provide: PAYMENT_GATEWAY, useClass: UnconfiguredPaymentGateway },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
