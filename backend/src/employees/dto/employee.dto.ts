import { ApiProperty } from '@nestjs/swagger';
import { EmployeeRole } from '@prisma/client';
import { IsEmail, IsIn, IsString, Length, MaxLength } from 'class-validator';

export class InviteEmployeeDto {
  @ApiProperty({ example: 'medewerker@example.nl' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ enum: EmployeeRole })
  @IsIn([EmployeeRole.MANAGER, EmployeeRole.STAFF])
  role: EmployeeRole;
}

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  @Length(32, 128)
  token: string;
}
