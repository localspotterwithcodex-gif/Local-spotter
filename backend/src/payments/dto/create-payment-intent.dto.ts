import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaymentPurpose, PaymentProvider, PaymentMethod } from '@prisma/client';

/**
 * Deliberately has NO amount, currency or provider-transaction fields: the
 * payable amount is always derived from server-side data, and the global
 * ValidationPipe (forbidNonWhitelisted) rejects any client attempt to send one.
 */
export class CreatePaymentIntentDto {
  @ApiProperty({ enum: PaymentPurpose })
  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @ApiProperty({ description: 'ID of the business subscription, order or workshop booking being paid' })
  @IsUUID()
  relatedEntityId!: string;

  @ApiPropertyOptional({ enum: PaymentProvider, default: PaymentProvider.STRIPE })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({ enum: [PaymentMethod.IDEAL], default: PaymentMethod.IDEAL, description: 'iDEAL is the only supported method' })
  @IsOptional()
  @IsIn([PaymentMethod.IDEAL], { message: 'Alleen iDEAL wordt ondersteund' })
  method?: PaymentMethod;
}
