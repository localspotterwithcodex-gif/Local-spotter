import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RouteStatus } from '@prisma/client';
import { CreateRouteStopDto } from './create-route-stop.dto';

export class CreateShopRouteDto {
  @ApiProperty({ example: 'Amsterdam City Walk', description: 'Route title' })
  @IsString()
  @IsNotEmpty({ message: 'Titel is verplicht' })
  title: string;

  @ApiPropertyOptional({ example: 'Verken de leukste winkels in het centrum', description: 'Route description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Amsterdam', description: 'City where the route is located' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: true, description: 'Whether route is published immediately' })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;

  @ApiPropertyOptional({
    description: 'Array of route stops',
    type: [Object],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopDto)
  stops?: CreateRouteStopDto[];

  @ApiPropertyOptional({ example: 'Ambacht', description: 'Theme of the route (free text, max 60)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  theme?: string;

  @ApiPropertyOptional({ description: 'Cover image URL (https)' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 3.5, description: 'Manual total distance in km (overrides the computed value)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  distanceKm?: number;

  @ApiPropertyOptional({ example: 90, description: 'Manual duration in minutes (overrides the computed value)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7 * 24 * 60)
  durationMinutes?: number;
}
