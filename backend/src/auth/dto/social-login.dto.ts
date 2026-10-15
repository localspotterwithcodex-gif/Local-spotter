import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class SocialLoginDto {
  @ApiProperty({ enum: ['google', 'facebook'] })
  @IsIn(['google', 'facebook'])
  provider: 'google' | 'facebook';

  @ApiProperty({ description: 'Google ID token or Facebook access token obtained in the browser' })
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  token: string;

  @ApiPropertyOptional({ enum: [UserRole.CONSUMER, UserRole.BUSINESS_OWNER], description: 'Only used when a NEW account is created' })
  @IsOptional()
  @IsIn([UserRole.CONSUMER, UserRole.BUSINESS_OWNER])
  role?: UserRole;
}
