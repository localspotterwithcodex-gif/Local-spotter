import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryShopRouteDto {
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

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by business ID' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;

  @ApiPropertyOptional({ description: 'Search keyword in title/description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by theme (case-insensitive exact match)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  theme?: string;

  @ApiPropertyOptional({ description: 'Maximum route length in km' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Maximum duration in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Only featured routes' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: ['featured', 'newest', 'distance', 'duration'] })
  @IsOptional()
  @IsIn(['featured', 'newest', 'distance', 'duration'])
  sort?: 'featured' | 'newest' | 'distance' | 'duration';
}
