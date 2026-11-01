import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class MfaCodeDto {
  @ApiProperty({ example: '123456', description: '6-digit code from the authenticator app' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code moet 6 cijfers zijn' })
  code: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: 'mfaToken returned by /auth/login when a second factor is required' })
  @IsString()
  @MaxLength(2048)
  mfaToken: string;

  @ApiProperty({ example: '123456', description: 'Authenticator code, or a recovery code like a1b2c-3d4e5' })
  @IsString()
  @Matches(/^(\d{6}|[0-9a-fA-F]{5}-[0-9a-fA-F]{5})$/, { message: 'Ongeldige code' })
  code: string;
}
