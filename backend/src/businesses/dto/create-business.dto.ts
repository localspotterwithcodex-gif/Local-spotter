import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Boetiek Amsterdam', description: 'Business store name' })
  @IsString()
  @IsNotEmpty({ message: 'Winkelnaam is verplicht' })
  name: string;

  @ApiPropertyOptional({ example: 'Duurzame mode in het hart van Amsterdam', description: 'Store description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '020-1234567', description: 'Store phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@boetiek-amsterdam.nl', description: 'Store contact email' })
  @IsOptional()
  @IsEmail({}, { message: 'Geldig e-mailadres is verplicht' })
  email?: string;

  @ApiProperty({ example: '87654321', description: 'Dutch KVK registration number' })
  @IsString()
  @IsNotEmpty({ message: 'KVK-nummer is verplicht' })
  kvkNumber: string;

  @ApiPropertyOptional({ example: 'uuid-category-id', description: 'Business category ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldig categorie ID' })
  categoryId?: string;

  @ApiProperty({ example: 'Noord-Holland', description: 'State or province' })
  @IsString()
  @IsNotEmpty({ message: 'Provincie is verplicht' })
  state: string;

  @ApiProperty({ example: 'Amsterdam', description: 'City' })
  @IsString()
  @IsNotEmpty({ message: 'Stad is verplicht' })
  city: string;

  @ApiProperty({ example: 'Keizersgracht 142, 1015 CX Amsterdam', description: 'Free-text location, optionally filled via GPS reverse-geocoding' })
  @IsString()
  @IsNotEmpty({ message: 'Locatie is verplicht' })
  address: string;

  @ApiPropertyOptional({ example: '1015 CX', description: 'Postal code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 52.3752, description: 'Latitude coordinate' })
  @IsOptional()
  @IsNumber({}, { message: 'Breedtegraad moet een getal zijn' })
  latitude?: number;

  @ApiPropertyOptional({ example: 4.8851, description: 'Longitude coordinate' })
  @IsOptional()
  @IsNumber({}, { message: 'Lengtegraad moet een getal zijn' })
  longitude?: number;
}
