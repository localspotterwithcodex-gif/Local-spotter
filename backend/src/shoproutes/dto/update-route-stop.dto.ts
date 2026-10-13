import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRouteStopDto {
  @ApiPropertyOptional({ example: 'uuid-business-id', description: 'New business ID' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldig business ID' })
  businessId?: string;

  @ApiPropertyOptional({ example: 52.3676, description: 'Latitude (-90 to 90)' })
  @IsOptional()
  @IsNumber()
  @Min(-90, { message: 'Latitude moet tussen -90 en 90 zijn' })
  @Max(90, { message: 'Latitude moet tussen -90 en 90 zijn' })
  latitude?: number;

  @ApiPropertyOptional({ example: 4.9041, description: 'Longitude (-180 to 180)' })
  @IsOptional()
  @IsNumber()
  @Min(-180, { message: 'Longitude moet tussen -180 en 180 zijn' })
  @Max(180, { message: 'Longitude moet tussen -180 en 180 zijn' })
  longitude?: number;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Stop description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 2, description: 'New sequence order' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Sequence moet minimaal 0 zijn' })
  sequence?: number;
}
