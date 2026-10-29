import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertPayoutAccountDto {
  @ApiProperty({ example: 'Bloemen Jansen B.V.' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  accountHolderName!: string;

  @ApiProperty({ example: 'NL91 ABNA 0417 1643 00' })
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  iban!: string;

  /** Accounts outside the IBAN network (e.g. India, US, UK sort-code): the bank details below are required instead of a valid IBAN. */
  @ApiProperty({ required: false, example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiProperty({ required: false, example: 'HDFCINBBXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  bic?: string;

  @ApiProperty({ required: false, example: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}

export class MarkPayoutPaidDto {
  @ApiProperty({ description: 'Bank transfer reference / batch id', example: 'SEPA-2026-W43' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  providerReference!: string;
}

export class FailPayoutDto {
  @ApiProperty({ enum: ['REJECTED', 'FAILED'] })
  @IsIn(['REJECTED', 'FAILED'])
  status!: 'REJECTED' | 'FAILED';

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
