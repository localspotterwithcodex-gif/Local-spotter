import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class BusinessHourItemDto {
  @ApiProperty({ example: 1, description: '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00', required: false })
  @IsOptional()
  @IsString()
  openTime?: string;

  @ApiProperty({ example: '18:00', required: false })
  @IsOptional()
  @IsString()
  closeTime?: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isClosed: boolean;
}

export class UpdateBusinessHoursDto {
  @ApiProperty({ type: [BusinessHourItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourItemDto)
  hours: BusinessHourItemDto[];
}
