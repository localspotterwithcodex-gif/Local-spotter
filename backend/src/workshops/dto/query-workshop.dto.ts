import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkshopStatus } from '@prisma/client';

export class QueryWorkshopDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by business ID' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Search keyword in title/description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by workshop status', enum: WorkshopStatus })
  @IsOptional()
  @IsString()
  status?: WorkshopStatus;

  @ApiPropertyOptional({ description: 'Return only upcoming workshops', default: true })
  @IsOptional()
  @IsBoolean()
  upcomingOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only workshops starting on/after this ISO date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Only workshops starting on/before this ISO date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
