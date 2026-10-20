import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GeoQueryDto } from '../../common/dto/geo-query.dto';

export const BUSINESS_SORTS = ['newest', 'rating', 'name', 'distance'] as const;
export type BusinessSort = (typeof BUSINESS_SORTS)[number];

export class QueryBusinessDto extends GeoQueryDto {
  @ApiPropertyOptional({ description: 'Search in name and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by business category ID' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of results (default 100, max 200)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ enum: BUSINESS_SORTS })
  @IsOptional()
  @IsIn(BUSINESS_SORTS as unknown as string[])
  sort?: BusinessSort;
}
