import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';

export class AdminUserQueryDto {
  @ApiPropertyOptional({ example: 'admin', description: 'Search by email or display name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by user role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by user status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 10, description: 'Number of results per page' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 0, description: 'Offset for pagination' })
  @IsOptional()
  @IsString()
  offset?: string;
}
