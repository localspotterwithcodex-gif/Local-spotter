import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type as ClassType } from 'class-transformer';

export class ReorderStopsDto {
  @ApiProperty({ description: 'Array of stops with new sequence order', type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @ClassType(() => ReorderStopItem)
  stops: ReorderStopItem[];
}

export class ReorderStopItem {
  @ApiProperty({ example: 'uuid-stop-id', description: 'Stop ID' })
  id: string;

  @ApiProperty({ example: 1, description: 'New sequence order' })
  @IsInt()
  @Min(0, { message: 'Sequence moet minimaal 0 zijn' })
  sequence: number;
}
