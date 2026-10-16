import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Notify me about new orders' })
  @IsOptional()
  @IsBoolean()
  notifyOrders?: boolean;

  @ApiPropertyOptional({ description: 'Notify me about new reviews' })
  @IsOptional()
  @IsBoolean()
  notifyReviews?: boolean;

  @ApiPropertyOptional({ description: 'Tips and product updates (stored; no tips are sent yet)' })
  @IsOptional()
  @IsBoolean()
  notifyTips?: boolean;
}
