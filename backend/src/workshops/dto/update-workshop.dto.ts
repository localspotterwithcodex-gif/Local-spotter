import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkshopStatus } from '@prisma/client';

export class UpdateWorkshopDto {
  @ApiPropertyOptional({ example: 'Gewijzigde titel', description: 'Workshop title (min 3 chars)' })
  @IsOptional()
  @IsString()
  @Min(3, { message: 'Titel moet minimaal 3 tekens bevatten' })
  title?: string;

  @ApiPropertyOptional({ example: 'Bijgewerkte beschrijving', description: 'Workshop description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 30.00, description: 'Price per person in EUR (must be >= 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Prijs moet een geldig bedrag zijn' })
  @Min(0, { message: 'Prijs mag niet negatief zijn' })
  price?: number;

  @ApiPropertyOptional({ example: 15, description: 'Maximum participants (must be >= bookedCount)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Capaciteit moet minimaal 1 zijn' })
  capacity?: number;

  @ApiPropertyOptional({ example: 'Rotterdam', description: 'Workshop location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 51.9225, description: 'Latitude (-90 to 90)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 4.4718, description: 'Longitude (-180 to 180)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: '2025-04-20T14:00:00Z', description: 'New start time' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2025-04-20T17:00:00Z', description: 'New end time' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-image.jpg', description: 'Optional new direct image URL' })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Ongeldige afbeeldings-URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'uuid-asset-id', description: 'Optional new media asset UUID' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldig media-asset ID' })
  imageAssetId?: string;

  @ApiPropertyOptional({ example: 'PUBLISHED', description: 'New workshop status', enum: WorkshopStatus })
  @IsOptional()
  @IsString()
  status?: WorkshopStatus;
}
