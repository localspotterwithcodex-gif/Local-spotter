import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: 'consument@example.nl', description: 'Email or mobile used to register' })
  @IsString()
  @IsNotEmpty({ message: 'E-mailadres of telefoonnummer is verplicht' })
  identifier: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @Length(6, 6, { message: 'Code moet 6 cijfers zijn' })
  code: string;
}

export class ResendCodeDto {
  @ApiProperty({ example: 'consument@example.nl', description: 'Email or mobile used to register' })
  @IsString()
  @IsNotEmpty({ message: 'E-mailadres of telefoonnummer is verplicht' })
  identifier: string;
}
