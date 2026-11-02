import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class SignupPhoneDto {
  @ApiProperty({ example: '+31612345678', description: 'Mobile number with country code' })
  @IsString()
  @IsNotEmpty({ message: 'Mobiel nummer is verplicht' })
  @MaxLength(32)
  phone: string;
}

export class SignupPhoneVerifyDto extends SignupPhoneDto {
  @ApiProperty({ example: '123456', description: '6-digit SMS code' })
  @IsString()
  @Length(6, 6, { message: 'Code moet 6 cijfers zijn' })
  code: string;
}
