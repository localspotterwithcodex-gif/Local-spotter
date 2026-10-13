import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateBusinessOwnerProfileDto {
  @ApiPropertyOptional({ example: 'Anouk van Dijk' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: '020-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}
