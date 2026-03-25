import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { HabitLogStatus } from '@prisma/client';

// UUID regex that accepts all versions including nil UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateHabitLogDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Habit ID',
  })
  @Matches(UUID_REGEX, { message: 'Habit ID must be a valid UUID' })
  habitId: string;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Date for the log entry (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'Date must be a valid date string' })
  date: string;

  @ApiProperty({
    enum: HabitLogStatus,
    example: HabitLogStatus.COMPLETED,
    description: 'Completion status',
  })
  @IsEnum(HabitLogStatus, { message: 'Status must be a valid HabitLogStatus' })
  status: HabitLogStatus;

  @ApiPropertyOptional({
    example: 'Completed 45 minutes of reading today!',
    description: 'Optional note for the log entry',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters' })
  note?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Target user ID (for admins setting SKIPPED_EXCUSED for others)',
  })
  @IsOptional()
  @Matches(UUID_REGEX, { message: 'Target user ID must be a valid UUID' })
  targetUserId?: string;
}

