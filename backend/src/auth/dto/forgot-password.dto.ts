import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

/** E-mail address or phone number (one of the two). */
export class ForgotPasswordDto {
  @ApiPropertyOptional({ example: 'sophie.vis@example.nl', description: 'Account e-mail address' })
  @ValidateIf((o: ForgotPasswordDto) => !o.identifier)
  @IsEmail({}, { message: 'Geldig e-mailadres is verplicht' })
  email?: string;

  @ApiPropertyOptional({ example: '06 12345678', description: 'E-mail address or mobile number' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  identifier?: string;
}
