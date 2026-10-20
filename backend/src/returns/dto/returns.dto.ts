import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class ReturnItemInputDto {
  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;
}

export class CreateReturnDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 'Het product is beschadigd aangekomen' })
  @IsString()
  @MinLength(5, { message: 'Geef een reden op' })
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({ type: [ReturnItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemInputDto)
  items!: ReturnItemInputDto[];
}

export class DecideReturnDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ description: 'Required when rejecting' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ReceiveReturnDto {
  @ApiPropertyOptional({ description: 'Put the returned items back in stock' })
  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}
