import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ description: 'lowercase letters, digits and dashes; generated from the name when omitted' })
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug mag alleen kleine letters, cijfers en streepjes bevatten' })
  @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'false hides the category from public lists without removing it' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
