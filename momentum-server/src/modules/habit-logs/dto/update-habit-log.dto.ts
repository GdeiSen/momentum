import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { HabitLogStatus } from '@prisma/client';

export class UpdateHabitLogDto {
  @ApiPropertyOptional({
    enum: HabitLogStatus,
    example: HabitLogStatus.COMPLETED,
    description: 'New completion status',
  })
  @IsOptional()
  @IsEnum(HabitLogStatus, { message: 'Status must be a valid HabitLogStatus' })
  status?: HabitLogStatus;

  @ApiPropertyOptional({
    example: 'Updated note for the log entry',
    description: 'Updated note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters' })
  note?: string;
}

