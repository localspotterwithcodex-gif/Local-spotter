import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class RegisterVideoDto {
  @ApiProperty({ description: 'Storage public id returned after uploading with the ticket from POST /media/videos/ticket' })
  @IsString()
  @MaxLength(300)
  @Matches(/^[A-Za-z0-9_\-/]+$/, { message: 'Ongeldige video' })
  publicId: string;
}
