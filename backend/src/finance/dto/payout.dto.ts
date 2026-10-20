import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertPayoutAccountDto {
  @ApiProperty({ example: 'Bloemen Jansen B.V.' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  accountHolderName!: string;

  @ApiProperty({ example: 'NL91 ABNA 0417 1643 00' })
  @IsString()
  @MinLength(15)
  @MaxLength(42)
  iban!: string;
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
