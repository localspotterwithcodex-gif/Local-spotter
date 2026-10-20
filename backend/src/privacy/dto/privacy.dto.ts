import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({ description: 'Type DELETE to confirm', example: 'DELETE' })
  @Equals('DELETE', { message: 'Typ DELETE om te bevestigen' })
  confirm: string;

  @ApiPropertyOptional({ description: 'Current password (required when the account has one)' })
  @IsOptional()
  @IsString()
  @MaxLength(72)
  password?: string;
}
