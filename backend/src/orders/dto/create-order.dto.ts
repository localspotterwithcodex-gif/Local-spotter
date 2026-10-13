import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DeliveryAddressDto {
  @ApiProperty({ example: 'Keizersgracht', description: 'Street name' })
  @IsNotEmpty({ message: 'Straatnaam is verplicht' })
  @IsString()
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

export class CreateOrderDto {
  @ApiProperty({ description: 'Delivery address for order fulfillment' })
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  @IsNotEmpty({ message: 'Bezorgadres is verplicht' })
  deliveryAddress: DeliveryAddressDto;
}
