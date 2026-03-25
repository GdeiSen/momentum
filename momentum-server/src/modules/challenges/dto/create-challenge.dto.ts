import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsDateString, IsUrl, ValidateIf } from 'class-validator';

export class CreateChallengeDto {
  @ApiProperty({
    example: 'Winter Productivity Sprint',
    description: 'Challenge title',
  })
  @IsString()
  @MinLength(2, { message: 'Title must be at least 2 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @ApiPropertyOptional({
    example: 'A 30-day challenge to build productive habits during winter.',
    description: 'Challenge description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @ApiProperty({
    example: '2025-01-01',
    description: 'Challenge start date (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'Start date must be a valid date string' })
  startDate: string;

  @ApiProperty({
    example: '2025-01-31',
    description: 'Challenge end date (YYYY-MM-DD)',
  })
  @IsDateString({}, { message: 'End date must be a valid date string' })
  endDate: string;

  @ApiPropertyOptional({
    example: 'https://example.com/poster.jpg',
    description: 'Challenge poster image URL',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.posterUrl !== '' && o.posterUrl != null)
  @IsUrl({}, { message: 'Poster URL must be a valid URL' })
  @MaxLength(500, { message: 'Poster URL must not exceed 500 characters' })
  posterUrl?: string;
}

