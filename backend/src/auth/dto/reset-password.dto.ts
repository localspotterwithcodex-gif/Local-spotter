import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'token-uuid-1234', description: 'Password reset token' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is verplicht' })
  token: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'New password (min 8 chars)' })
  @IsString()
  @MinLength(8, { message: 'Nieuw wachtwoord moet minimaal 8 tekens lang zijn' })
  newPassword: string;
}
