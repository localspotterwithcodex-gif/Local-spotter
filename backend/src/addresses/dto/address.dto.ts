import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Thuis' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label: string;

  @ApiProperty({ example: 'Sanne de Jong' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ example: '+31612345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9()\-.\s]{7,20}$/, { message: 'Ongeldig telefoonnummer' })
  phone?: string;

  @ApiProperty({ example: 'Kerkstraat' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  street: string;

  @ApiPropertyOptional({ example: '12A' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  houseNumber?: string;

  @ApiPropertyOptional({ example: '1234 AB' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  postalCode?: string;

  @ApiProperty({ example: 'Delft' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  city: string;

  @ApiPropertyOptional({ example: 'NL', default: 'NL' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
