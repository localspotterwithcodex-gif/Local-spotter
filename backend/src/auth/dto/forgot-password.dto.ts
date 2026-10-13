import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'sophie.vis@example.nl', description: 'User email address' })
  @IsEmail({}, { message: 'Geldig e-mailadres is verplicht' })
  @IsNotEmpty({ message: 'E-mailadres is verplicht' })
  email: string;
}
