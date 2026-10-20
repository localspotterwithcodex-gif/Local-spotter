import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'MediaAsset id of the shop logo (from POST /media/images). null removes the logo.', nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsUUID()
  logoAssetId?: string | null;

  @ApiPropertyOptional({ description: 'MediaAsset id of the shop cover image (from POST /media/images). null removes the cover.', nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsUUID()
  coverAssetId?: string | null;

  @ApiPropertyOptional({ description: 'MediaAsset id of the 360° (equirectangular, 2:1) photo of the shop (from POST /media/images). null removes it.', nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsUUID()
  panoramaAssetId?: string | null;

  @ApiPropertyOptional({ example: 'https://www.mijnwinkel.nl' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] }, { message: 'Ongeldige website-URL' })
  @MaxLength(300)
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.mijnwinkel.nl' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] }, { message: 'Ongeldige website-URL' })
  @MaxLength(300)
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.mijnwinkel.nl' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] }, { message: 'Ongeldige website-URL' })
  @MaxLength(300)
  facebookUrl?: string;

  @ApiPropertyOptional({ example: 'https://www.mijnwinkel.nl' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] }, { message: 'Ongeldige website-URL' })
  @MaxLength(300)
  tiktokUrl?: string;

  // ---- Fulfilment (what customers can choose at checkout) ----

  @ApiPropertyOptional() @IsOptional() @IsBoolean() pickupEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shippingEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() localDeliveryEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Shipping fee in EUR; null = platform default', nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  shippingFee?: number | null;

  @ApiPropertyOptional({ description: 'Shipping is free from this subtotal (EUR); null = never', nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  freeShippingThreshold?: number | null;

  @ApiPropertyOptional({ description: 'Local delivery fee in EUR' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  localDeliveryFee?: number;

  @ApiPropertyOptional({ description: 'Local delivery radius in km; null = same town only', nullable: true })
  @ValidateIf((_o, v) => v !== undefined && v !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(200)
  localDeliveryRadiusKm?: number | null;
}
