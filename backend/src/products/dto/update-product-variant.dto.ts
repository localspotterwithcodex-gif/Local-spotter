import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductVariantDto {
  @ApiPropertyOptional({ example: 'L' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'Bruin' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'SHOPPER-BRN-L' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 159.95 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Variantprijs moet een geldig bedrag zijn' })
  @Min(0, { message: 'Variantprijs mag niet negatief zijn' })
  price?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Voorraad moet een geheel getal zijn' })
  @Min(0, { message: 'Voorraad mag niet negatief zijn' })
  stock?: number;
}
