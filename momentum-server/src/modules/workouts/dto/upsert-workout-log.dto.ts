import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutLogStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertWorkoutLogDto {
  @ApiProperty({
    enum: WorkoutLogStatus,
    example: WorkoutLogStatus.COMPLETED,
  })
  @IsEnum(WorkoutLogStatus)
  status: WorkoutLogStatus;

  @ApiPropertyOptional({
    example: 42,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 470,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  caloriesBurned?: number;

  @ApiPropertyOptional({
    example: 6200,
    minimum: 1,
    description: 'Distance in meters',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  distanceMeters?: number;

  @ApiPropertyOptional({
    example: 'Felt strong and maintained steady pace.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

