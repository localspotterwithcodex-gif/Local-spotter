import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Min, IsIn, IsInt, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Handgemaakte Leren Shopper', description: 'Product title / name' })
  @IsString()
  @IsNotEmpty({ message: 'Productnaam is verplicht' })
  name: string;

  @ApiPropertyOptional({ example: 'Prachtige shopper tas van plantaardig gelooid leer', description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 149.95, description: 'Price in EUR (must be >= 0)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Prijs moet een geldig bedrag zijn' })
  @Min(0, { message: 'Prijs mag niet negatief zijn' })
  price: number;

  @ApiPropertyOptional({ example: 179.95, description: 'Previous (struck-through) price; must be higher than price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Oude prijs moet een geldig bedrag zijn' })
  @Min(0)
  compareAtPrice?: number;

  @ApiProperty({ example: 15, description: 'Inventory stock count (must be >= 0)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Voorraad mag niet negatief zijn' })
  stock: number;

  @ApiPropertyOptional({ example: 'uuid-category-id', description: 'Product category UUID' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldig categorie ID' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 'https://mijnwinkel.nl/product-link', description: 'Optional external shop product URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Ongeldige shop URL' })
  shopUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Product active status' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 21, description: 'VAT percentage included in the price (0, 9 or 21)' })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 9, 21], { message: 'BTW-percentage moet 0, 9 of 21 zijn' })
  vatRate?: number;

  @ApiPropertyOptional({ example: 'Studio Leer' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ example: 850, description: 'Weight in grams' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  weightGrams?: number;

  @ApiPropertyOptional({ example: 300, description: 'Length in millimetres' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  lengthMm?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  widthMm?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  heightMm?: number;
}
