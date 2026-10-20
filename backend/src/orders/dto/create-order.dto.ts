import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FulfilmentMethod } from '@prisma/client';

export class DeliveryAddressDto {
  @ApiProperty({ example: 'Keizersgracht', description: 'Street name' })
  @IsNotEmpty({ message: 'Straatnaam is verplicht' })
  @IsString()
  @MaxLength(200)
  street: string;

  @ApiPropertyOptional({ example: '421-B', description: 'House number and addition' })
  @IsOptional()
  @IsString()
  houseNumber?: string;

  @ApiProperty({ example: 'Amsterdam', description: 'City' })
  @IsNotEmpty({ message: 'Plaatsnaam is verplicht' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: '1016 EK', description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'NL', default: 'NL', description: 'Country code (ISO-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Bel bij nummer 421', description: 'Delivery notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 52.3676, description: 'Delivery latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 4.9041, description: 'Delivery longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class StoreFulfilmentDto {
  @ApiProperty({ description: 'Store the choice applies to' })
  @IsUUID('4')
  businessId: string;

  @ApiProperty({ enum: FulfilmentMethod })
  @IsEnum(FulfilmentMethod)
  method: FulfilmentMethod;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Delivery address; required unless every store is picked up' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiPropertyOptional({
    type: [StoreFulfilmentDto],
    description: 'Per-store fulfilment method; stores that are not listed default to SHIPPING',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => StoreFulfilmentDto)
  fulfilments?: StoreFulfilmentDto[];
}
