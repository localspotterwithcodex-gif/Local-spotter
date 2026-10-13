import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewStatus } from '@prisma/client';

export class ModerateProductDto {
  @ApiProperty({ example: false })
  active: boolean;
}

export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.HIDDEN })
  @IsEnum(ReviewStatus, { message: 'Ongeldige reviewstatus' })
  status: ReviewStatus;
}

export class ModerateCommentDto {
  @ApiProperty({ example: 'HIDDEN' })
  @IsString()
  status: string;
}

export class ResolveReportDto {
  @ApiProperty({ example: 'RESOLVED' })
  @IsString()
  status: string;
}

export class AdminProductQueryDto {
  @ApiPropertyOptional({ example: 'true', description: 'Filter by active status' })
  @IsOptional()
  @IsString()
  active?: string;

  @ApiPropertyOptional({ example: 20, description: 'Number of results per page' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 0, description: 'Offset for pagination' })
  @IsOptional()
  @IsString()
  offset?: string;

  @ApiPropertyOptional({ example: 'electronics', description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminReviewQueryDto {
  @ApiPropertyOptional({ enum: ReviewStatus, description: 'Filter by review status' })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({ example: 20, description: 'Number of results per page' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 0, description: 'Offset for pagination' })
  @IsOptional()
  @IsString()
  offset?: string;
}
