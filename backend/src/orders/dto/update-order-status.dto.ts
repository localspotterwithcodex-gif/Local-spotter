import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum AllowedOrderStatusInput {
  CONFIRMED = 'CONFIRMED',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: AllowedOrderStatusInput,
    example: AllowedOrderStatusInput.CONFIRMED,
    description: 'New order status transition',
  })
  @IsNotEmpty({ message: 'Status is verplicht' })
  @IsEnum(AllowedOrderStatusInput, { message: 'Ongeldige bestelstatus' })
  status: AllowedOrderStatusInput;

  @ApiPropertyOptional({
    example: 'Bestelling wordt klaargemaakt in de bakkerij',
    description: 'Optional note or reason for the status change',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
