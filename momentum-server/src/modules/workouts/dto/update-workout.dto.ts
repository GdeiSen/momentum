import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateWorkoutDto {
  @ApiPropertyOptional({
    example: 'Evening Strength Session',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({
    example: 'Upper body + core, medium intensity',
    maxLength: 5000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    enum: WorkoutType,
    example: WorkoutType.STRENGTH,
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
    example: 50,
    minimum: 1,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @ApiPropertyOptional({
    example: 620,
    minimum: 1,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  caloriesTarget?: number | null;

  @ApiPropertyOptional({
    example: false,
    description: 'Archive or unarchive workout',
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

