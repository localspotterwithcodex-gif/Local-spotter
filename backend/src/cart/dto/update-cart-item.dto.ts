import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'New quantity (must be >= 1)' })
  @Type(() => Number)
  @IsInt({ message: 'Hoeveelheid moet een geheel getal zijn' })
  @Min(1, { message: 'Hoeveelheid moet minimaal 1 zijn' })
  quantity: number;
}
