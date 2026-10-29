import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateConsumerProfileDto {
  @ApiPropertyOptional({ example: 'Sophie Vis' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Sophie' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Vis' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '06-34567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id from POST /media/images; null removes the picture' })
  @IsOptional()
  @IsUUID()
  profileImageAssetId?: string | null;
}
