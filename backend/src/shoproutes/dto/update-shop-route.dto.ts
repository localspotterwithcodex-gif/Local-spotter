import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
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
}
