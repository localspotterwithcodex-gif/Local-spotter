import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength, Max } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({ description: 'Refund amount in EUR (> 0, at most 2 decimals, ≤ refundable balance)' })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(1_000_000)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
