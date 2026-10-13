import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty({ example: 2, description: 'Number of seats to book (1-20)' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Minimaal 1 stoel boeken' })
  @Max(20, { message: 'Maximaal 20 stoelen per boeking' })
  quantity: number;
}
