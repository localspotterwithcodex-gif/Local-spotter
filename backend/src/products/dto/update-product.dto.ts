import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Handgemaakte Leren Shopper' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Vernieuwde omschrijving van het product' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 139.95 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Prijs moet een geldig bedrag zijn' })
  @Min(0, { message: 'Prijs mag niet negatief zijn' })
  price?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Voorraad mag niet negatief zijn' })
  stock?: number;

  @ApiPropertyOptional({ example: 'uuid-category-id' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldig categorie ID' })
  categoryId?: string;

  @ApiPropertyOptional({ example: 'https://mijnwinkel.nl/product-link' })
  @IsOptional()
  @IsUrl({}, { message: 'Ongeldige shop URL' })
  shopUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
