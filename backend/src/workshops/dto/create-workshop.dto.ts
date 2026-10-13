import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkshopStatus } from '@prisma/client';

export class CreateWorkshopDto {
  @ApiProperty({ example: 'Handgemaakte Kaarsen Workshop', description: 'Workshop title' })
  @IsString()
  @IsNotEmpty({ message: 'Titel is verplicht' })
  @Min(3, { message: 'Titel moet minimaal 3 tekens bevatten' })
  title: string;

  @ApiPropertyOptional({ example: 'Leer het maken van eigen kaarsen', description: 'Workshop description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 25.00, description: 'Price per person in EUR (must be >= 0)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Prijs moet een geldig bedrag zijn' })
  @Min(0, { message: 'Prijs mag niet negatief zijn' })
  price: number;

  @ApiProperty({ example: 10, description: 'Maximum number of participants (must be >= 1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Capaciteit moet minimaal 1 zijn' })
  capacity: number;

  @ApiPropertyOptional({ example: 'Amsterdam', description: 'Workshop location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 52.3676, description: 'Latitude (-90 to 90)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 4.9041, description: 'Longitude (-180 to 180)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: '2025-03-15T10:00:00Z', description: 'Workshop start time (must be in the future)' })
  @IsString()
  startTime: string;

  @ApiPropertyOptional({ example: '2025-03-15T13:00:00Z', description: 'Workshop end time (must be after startTime)' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: 'https://example.com/workshop-image.jpg', description: 'Optional direct image URL' })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Ongeldige afbeeldings-URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'uuid-asset-id', description: 'Optional media asset UUID for image' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldig media-asset ID' })
  imageAssetId?: string;

  @ApiPropertyOptional({ example: 'PUBLISHED', description: 'Workshop status (DRAFT or PUBLISHED)', enum: WorkshopStatus })
  @IsOptional()
  @IsString()
  status?: WorkshopStatus;

  @ApiProperty({ example: 'uuid-business-id', description: 'Business ID that owns this workshop' })
  @IsUUID('4', { message: 'Ongeldig business ID' })
  businessId: string;
}
