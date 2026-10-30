import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { GeoQueryDto } from '../../common/dto/geo-query.dto';

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'distance'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export class QueryProductDto extends GeoQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by business ID' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Search term for name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Comma-separated keywords (from photo search): products matching ANY of them' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  searchAny?: string;

  @ApiPropertyOptional({ description: 'Only products that are in stock' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS })
  @IsOptional()
  @IsIn(PRODUCT_SORTS as unknown as string[])
  sort?: ProductSort;
}
