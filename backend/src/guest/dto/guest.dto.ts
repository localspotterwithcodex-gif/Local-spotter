import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateGuestDto {
  @ApiProperty({ example: 'jan@voorbeeld.nl' })
  @IsEmail({}, { message: 'Ongeldig e-mailadres' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Jan de Vries' })
  @IsString()
  @MinLength(2, { message: 'Vul je naam in' })
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: '+31612345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ description: 'Must be true: terms of use and privacy policy accepted' })
  @IsBoolean()
  @Equals(true, { message: 'Accepteer de voorwaarden en het privacybeleid om door te gaan' })
  acceptTerms!: boolean;
}

export class GuestSessionDto {
  @ApiProperty({ description: 'Token from the emailed order link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  token!: string;
}

export class GuestOrderLinkDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'LS-20261021-AB12' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  orderNumber!: string;
}

export class ClaimCompleteDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'De code bestaat uit 6 cijfers' })
  code!: string;

  @ApiProperty({ description: 'Minimum 8 characters' })
  @IsString()
  @Length(8, 72, { message: 'Wachtwoord moet 8 tot 72 tekens lang zijn' })
  password!: string;
}
