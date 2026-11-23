import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginOtpTokenDto {
  @ApiProperty({ description: 'otpToken returned by /auth/login when an SMS code is required' })
  @IsString()
  @MaxLength(2048)
  otpToken: string;
}

export class LoginOtpVerifyDto extends LoginOtpTokenDto {
  @ApiProperty({ example: '123456', description: '6-digit code from the SMS' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code moet 6 cijfers zijn' })
  code: string;
}

export class ResetCodeVerifyDto {
  @ApiProperty({ example: '+31612345678', description: 'The e-mail address or phone number used to request the code' })
  @IsString()
  @MinLength(3)
  @MaxLength(254)
  identifier: string;

  @ApiProperty({ example: '123456', description: '6-digit code from the SMS' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code moet 6 cijfers zijn' })
  code: string;
}
