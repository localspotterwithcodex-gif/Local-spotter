import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty({ example: 2, description: 'Number of seats to book (1-20)' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Minimaal 1 stoel boeken' })
  @Max(20, { message: 'Maximaal 20 stoelen per boeking' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Session to book; required when the workshop has several open sessions' })
  @IsOptional()
  @IsUUID('4', { message: 'Ongeldige sessie' })
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Confirms that every participant meets the workshop minimum age' })
  @IsOptional()
  @IsBoolean()
  acceptMinAge?: boolean;
}
