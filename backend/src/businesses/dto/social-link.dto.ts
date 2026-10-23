import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUrl, MaxLength } from 'class-validator';
import { SOCIAL_PLATFORMS, SocialPlatform } from '../social-links';

export class SocialLinkDto {
  @ApiProperty({ enum: SOCIAL_PLATFORMS })
  @IsIn(SOCIAL_PLATFORMS as readonly string[], { message: 'Onbekend social-mediaplatform' })
  platform!: SocialPlatform;

  @ApiProperty({ example: 'https://www.instagram.com/mijnwinkel' })
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] }, { message: 'Ongeldige social-media-URL' })
  @MaxLength(300)
  url!: string;
}
