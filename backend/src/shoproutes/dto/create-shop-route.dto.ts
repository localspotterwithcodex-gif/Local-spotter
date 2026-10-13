import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, Max, ValidateNested } from 'class-validator';
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
}
