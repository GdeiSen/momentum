import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateHabitLogDto } from './create-habit-log.dto';

export class BulkUpdateHabitLogsDto {
  @ApiProperty({
    type: [CreateHabitLogDto],
    description: 'Array of habit logs to create or update',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one log entry is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateHabitLogDto)
  logs: CreateHabitLogDto[];
}

