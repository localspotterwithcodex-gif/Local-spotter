import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, IsUUID, Min, Max, Length, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Rating from 1 to 5 stars' })
  @IsInt()
  @Min(1, { message: 'Rating moet minstens 1 zijn' })
  @Max(5, { message: 'Rating mag maximaal 5 zijn' })
  rating: number;

  @ApiPropertyOptional({ example: 'Goed winkel', description: 'Short title (optional for reviews after a delivered order / booking)' })
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'Titel moet tussen de 1 en 100 tekens zijn' })
  title?: string;

  @ApiPropertyOptional({ example: 'Heerlijke koffee en vriendelijk personeel', description: 'Review text (optional for reviews after a delivered order / booking)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Review mag maximaal 1000 tekens zijn' })
  comment?: string;

  @ApiPropertyOptional({ description: 'A delivered order of this customer in this shop being reviewed' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'A workshop of this shop the customer attended (booking completed)' })
  @IsOptional()
  @IsUUID()
  workshopId?: string;
}
