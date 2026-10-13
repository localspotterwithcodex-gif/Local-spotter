import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiPropertyOptional({ example: 'M', description: 'Size (e.g. S, M, L, XL, XXL)' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'Zwart', description: 'Color name or hex' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'SHOPPER-BLK-M', description: 'Stock Keeping Unit identifier' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 149.95, description: 'Optional price override for this variant' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Variantprijs moet een geldig bedrag zijn' })
  @Min(0, { message: 'Variantprijs mag niet negatief zijn' })
  price?: number;

  @ApiProperty({ example: 8, description: 'Stock quantity for this variant' })
  @Type(() => Number)
  @IsInt({ message: 'Voorraad moet een geheel getal zijn' })
  @Min(0, { message: 'Voorraad mag niet negatief zijn' })
  stock: number;
}
