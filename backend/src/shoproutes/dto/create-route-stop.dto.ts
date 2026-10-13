import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRouteStopDto {
  @ApiProperty({ example: 'uuid-business-id', description: 'Business UUID for this stop' })
  @IsUUID('4', { message: 'Ongeldig business ID' })
  businessId: string;

  @ApiProperty({ example: 'Boetiek Amsterdam', description: 'Stop title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 52.3676, description: 'Latitude (-90 to 90)' })
  @IsNumber()
  @Min(-90, { message: 'Latitude moet tussen -90 en 90 zijn' })
  @Max(90, { message: 'Latitude moet tussen -90 en 90 zijn' })
  latitude: number;

  @ApiProperty({ example: 4.9041, description: 'Longitude (-180 to 180)' })
  @IsNumber()
  @Min(-180, { message: 'Longitude moet tussen -180 en 180 zijn' })
  @Max(180, { message: 'Longitude moet tussen -180 en 180 zijn' })
  longitude: number;

  @ApiPropertyOptional({ example: 'Museum quarter', description: 'Stop description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, description: 'Sequence order within the route' })
  @IsInt()
  @Min(0, { message: 'Sequence moet minimaal 0 zijn' })
  sequence: number;
}
