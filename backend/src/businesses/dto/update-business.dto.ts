import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Boetiek Amsterdam' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Nieuwe omschrijving van de winkel' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '020-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@boetiek-amsterdam.nl' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '87654321' })
  @IsOptional()
  @IsString()
  kvkNumber?: string;

  @ApiPropertyOptional({ example: 'uuid-category-id' })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Noord-Holland' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Amsterdam' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Keizersgracht 142, 1015 CX Amsterdam' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1015 CX' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 52.3752 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 4.8851 })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
