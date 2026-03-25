import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWorkoutDto {
  @ApiProperty({
    example: 'Morning Run',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({
    example: 'Easy pace 5km run around the park',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    enum: WorkoutType,
    example: WorkoutType.CARDIO,
    default: WorkoutType.OTHER,
  })
  @IsOptional()
  @IsEnum(WorkoutType)
  type?: WorkoutType;

  @ApiPropertyOptional({
    example: '2026-03-26',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string | null;

  @ApiPropertyOptional({
    example: 45,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 500,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  caloriesTarget?: number;
}

