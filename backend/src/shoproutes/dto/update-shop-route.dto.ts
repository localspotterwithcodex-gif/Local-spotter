import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RouteStatus } from '@prisma/client';

export class UpdateShopRouteDto {
  @ApiPropertyOptional({ example: 'Bijgewerkte titel', description: 'Route title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Bijgewerkte beschrijving', description: 'Route description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Rotterdam', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'PUBLISHED', description: 'Route status', enum: RouteStatus })
  @IsOptional()
  @IsString()
  status?: RouteStatus;

  @ApiPropertyOptional({ example: 'Ambacht', description: 'Theme of the route (free text, max 60)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  theme?: string;

  @ApiPropertyOptional({ description: 'Cover image URL (https)' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 3.5, description: 'Manual total distance in km (overrides the computed value)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  distanceKm?: number;

  @ApiPropertyOptional({ example: 90, description: 'Manual duration in minutes (overrides the computed value)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7 * 24 * 60)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Feature the route on the overview (admin only)' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
