import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaPurpose } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UploadTicketDto {
  @ApiProperty({ enum: MediaPurpose })
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;

  @ApiProperty({ example: 'image/jpeg', description: 'Declared type; the server checks the real type after upload' })
  @IsString()
  @MaxLength(100)
  contentType: string;

  @ApiProperty({ example: 524288, description: 'Declared size in bytes; checked again after upload' })
  @IsInt()
  @Min(1)
  size: number;

  @ApiPropertyOptional() @IsOptional() @IsUUID() businessId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() reviewId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() conversationId?: string;
}

export class ConfirmUploadDto {
  @ApiProperty({ description: 'assetId from POST /media/upload-ticket' })
  @IsUUID()
  assetId: string;
}
