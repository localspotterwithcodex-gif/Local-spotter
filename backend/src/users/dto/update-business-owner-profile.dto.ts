import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateBusinessOwnerProfileDto {
  @ApiPropertyOptional({ example: 'Anouk van Dijk' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: '020-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id from POST /media/images; null removes the picture' })
  @IsOptional()
  @IsUUID()
  profileImageAssetId?: string | null;
}
