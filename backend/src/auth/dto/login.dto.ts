import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'sophie.vis@example.nl',
    description: 'Email address, mobile number, or username (used by admin accounts) to sign in with',
  })
  @IsString()
  @IsNotEmpty({ message: 'E-mailadres, telefoonnummer of gebruikersnaam is verplicht' })
  @MinLength(3, { message: 'Ongeldige inloggegevens' })
  identifier: string;

  @ApiProperty({ example: 'Password123!', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Wachtwoord is verplicht' })
  password: string;
}
