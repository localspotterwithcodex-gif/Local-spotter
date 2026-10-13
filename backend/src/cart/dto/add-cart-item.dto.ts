import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @ApiProperty({ description: 'Business ID (cart must be from one business)' })
  @IsUUID('4', { message: 'Ongeldig bedrijf ID' })
  businessId: string;

  @ApiProperty({ description: 'Product ID to add' })
  @IsUUID('4', { message: 'Ongeldig product ID' })
  productId: string;

  @ApiPropertyOptional({ description: 'Optional product variant ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldig variant ID' })
  variantId?: string;

  @ApiProperty({ example: 1, description: 'Quantity to add (must be >= 1)' })
  @Type(() => Number)
  @IsInt({ message: 'Hoeveelheid moet een geheel getal zijn' })
  @Min(1, { message: 'Hoeveelheid moet minimaal 1 zijn' })
  quantity: number;
}
