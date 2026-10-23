import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['7', '30', '90'], description: 'Period length in days (default 30)' })
  @IsOptional()
  @IsIn(['7', '30', '90'])
  days?: string;

  @ApiPropertyOptional({ description: 'Only shops in this province/region' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ description: 'Only shops in this shop category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
