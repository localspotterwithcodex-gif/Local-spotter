import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
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
}
