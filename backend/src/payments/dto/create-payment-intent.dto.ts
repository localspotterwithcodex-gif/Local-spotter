import { ApiProperty } from '@nestjs/swagger';
import { PaymentPurpose, PaymentProvider, PaymentMethod } from '@prisma/client';

export class CreatePaymentIntentDto {
  @ApiProperty({ enum: PaymentPurpose, description: 'Payment purpose: BUSINESS_SUBSCRIPTION, PRODUCT_ORDER, or WORKSHOP_BOOKING' })
  purpose: PaymentPurpose;

  @ApiProperty({ description: 'ID of the related entity (businessSubscriptionId, orderId, or workshopBookingId)' })
  relatedEntityId: string;

  @ApiProperty({ enum: PaymentProvider, description: 'Payment provider: STRIPE, MOLLIE, PAYPAL' })
  provider: PaymentProvider;

  @ApiProperty({ description: 'Payment amount in EUR (decimal)' })
  amount: number;

  @ApiProperty({ 
    enum: PaymentMethod, 
    description: 'Payment method: CARD, IDEAL, BANK_TRANSFER' 
  })
  method?: PaymentMethod;

  @ApiProperty({ 
    description: 'Stripe/MOLLIE provider transaction ID' 
  })
  providerTransactionId?: string;

  @ApiProperty({ 
    description: 'Business subscription ID (for BUSINESS_SUBSCRIPTION purpose)' 
  })
  businessSubscriptionId?: string;

  @ApiProperty({ 
    description: 'Order ID (for PRODUCT_ORDER purpose)' 
  })
  orderId?: string;

  @ApiProperty({ 
    description: 'Workshop booking ID (for WORKSHOP_BOOKING purpose)' 
  })
  workshopBookingId?: string;

  @ApiProperty({ 
    description: 'Currency code, default EUR' 
  })
  currency?: string;
}