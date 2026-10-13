import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsUrl, IsUUID, Min } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7', description: 'Image URL' })
  @IsUrl({}, { message: 'Geldige afbeeldings-URL is verplicht' })
  @IsNotEmpty({ message: 'Afbeeldings-URL mag niet leeg zijn' })
  url: string;

  @ApiPropertyOptional({ example: 0, description: 'Display sort order (0, 1, 2)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: 'uuid-media-asset-id', description: 'Existing MediaAsset ID if pre-uploaded' })
  @IsOptional()
  @IsUUID('4')
  mediaAssetId?: string;
}
