import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsBoolean, IsInt, IsNumber, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkshopSessionInputDto {
  @ApiProperty({ example: '2027-03-15T10:00:00Z' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '2027-03-15T13:00:00Z' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: 10, description: 'Seats for this session (defaults to the workshop capacity)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;
}
import { WorkshopStatus } from '@prisma/client';

export class CreateWorkshopDto {
  @ApiProperty({ example: 'Handgemaakte Kaarsen Workshop', description: 'Workshop title' })
  @IsString()
  @IsNotEmpty({ message: 'Titel is verplicht' })
  @MinLength(3, { message: 'Titel moet minimaal 3 tekens bevatten' })
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

  @ApiPropertyOptional({ example: '2025-03-15T10:00:00Z', description: 'Start of a single-session workshop (use `sessions` for several)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '2025-03-15T13:00:00Z', description: 'End of a single-session workshop' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ type: [WorkshopSessionInputDto], description: 'One or more dated sessions, each with its own capacity' })
  @IsOptional()
  @ValidateNested({ each: true })
  @ArrayMaxSize(30)
  @Type(() => WorkshopSessionInputDto)
  sessions?: WorkshopSessionInputDto[];

  @ApiPropertyOptional({ example: 48, description: 'Participants cancelling at least this many hours before a session get the refund percentage back' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  cancellationDeadlineHours?: number;

  @ApiPropertyOptional({ example: 100, description: 'Refund percentage for cancellations before the deadline (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  refundPercentage?: number;

  @ApiPropertyOptional({ example: 16, description: 'Minimum participant age' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  minAge?: number;

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
