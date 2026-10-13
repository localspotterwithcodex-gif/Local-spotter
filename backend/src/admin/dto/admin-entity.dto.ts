import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus, PaymentStatus, SubscriptionStatus, UserRole } from '@prisma/client';

export class AdminOrderQueryDto {
  @ApiProperty({ enum: OrderStatus, required: false, description: 'Filter by order status' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ example: 20, required: false, description: 'Number of results per page' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({ example: 0, required: false, description: 'Offset for pagination' })
  @IsOptional()
  @IsString()
  offset?: string;
}

export class AdminPaymentQueryDto {
  @ApiProperty({ enum: PaymentStatus, required: false, description: 'Filter by payment status' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ example: 'PRODUCT_ORDER', required: false, description: 'Filter by payment purpose' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty({ example: 20, required: false, description: 'Number of results per page' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({ example: 0, required: false, description: 'Offset for pagination' })
  @IsOptional()
  @IsString()
  offset?: string;
}

export class AdminSubscriptionQueryDto {
  @ApiProperty({ enum: SubscriptionStatus, required: false, description: 'Filter by subscription status' })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ example: 20, required: false, description: 'Number of results per page' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({ example: 0, required: false, description: 'Offset for pagination' })
  @IsOptional()
  @IsString()
  offset?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'CONFIRMED' })
  @IsString()
  status: string;

  @ApiProperty({ example: 'Admin correction via platform management' })
  @IsString()
  reason: string;
}
