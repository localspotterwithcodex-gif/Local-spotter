import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, IsUUID, MaxLength } from 'class-validator';

export class AttachReviewMediaDto {
  @ApiProperty({ type: [String], description: 'Confirmed media asset ids in display order (empty = no media)' })
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  assetIds: string[];
}

export class ReviewReplyDto {
  @ApiProperty({ description: 'Public reply from the shop (empty removes it)' })
  @IsString()
  @MaxLength(1000)
  text: string;
}
