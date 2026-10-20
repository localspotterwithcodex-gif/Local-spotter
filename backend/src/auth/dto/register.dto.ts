import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiPropertyOptional({
    example: 'consument@example.nl',
    description: 'User email address. Either email or phone must be provided.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Geldig e-mailadres is verplicht' })
  email?: string;

  @ApiProperty({ example: 'Password123!', description: 'Minimum 8 characters' })
  @IsString()
  @MinLength(8, { message: 'Wachtwoord moet minimaal 8 tekens lang zijn' })
  @MaxLength(72, { message: 'Wachtwoord mag maximaal 72 tekens lang zijn' })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CONSUMER, description: 'CONSUMER or BUSINESS_OWNER' })
  @IsIn([UserRole.CONSUMER, UserRole.BUSINESS_OWNER], { message: 'Rol moet CONSUMER of BUSINESS_OWNER zijn' })
  role: UserRole;

  @ApiProperty({ example: 'Sophie Vis', description: 'Public display name' })
  @IsString()
  @IsNotEmpty({ message: 'Naam is verplicht' })
  displayName: string;

  @ApiPropertyOptional({ example: 'Sophie' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Vis' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '06-12345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Must be true: acceptance of the terms and the privacy policy' })
  @Equals(true, { message: 'Je moet de voorwaarden en het privacybeleid accepteren' })
  acceptTerms: boolean;
}
