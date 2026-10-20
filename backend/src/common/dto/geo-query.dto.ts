import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Shared "near me" query parameters. All three are needed for a distance filter. */
export class GeoQueryDto {
  @ApiPropertyOptional({ description: 'Latitude of the search centre' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude of the search centre' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ description: 'Radius in kilometres (0.5–200)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(200)
  radiusKm?: number;
}
