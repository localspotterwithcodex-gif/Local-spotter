import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min, Max, Length } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, description: 'Rating from 1 to 5 stars' })
  @IsInt()
  @Min(1, { message: 'Rating moet minstens 1 zijn' })
  @Max(5, { message: 'Rating mag maximaal 5 zijn' })
  rating: number;

  @ApiProperty({ example: 'Goed winkel', description: 'Ore titel van de review' })
  @IsString()
  @Length(1, 100, { message: 'Titel moet tussen de 1 en 100 tekens zijn' })
  title: string;

  @ApiProperty({ example: 'Heerlijke koffee en vriendelijk personeel', description: 'De review tekst' })
  @IsString()
  @Length(1, 1000, { message: 'Review moet tussen de 1 en 1000 tekens zijn' })
  comment: string;
}