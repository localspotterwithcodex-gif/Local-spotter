import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({
    example: 'Klant wenst bestelling te annuleren',
    description: 'Reason for cancelling the order',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
