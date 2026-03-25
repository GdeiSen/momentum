import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTeamChannelDto {
  @ApiPropertyOptional({
    example: 'Announcements',
    minLength: 2,
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({
    example: 'Only important updates from team admins',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Archive or unarchive the channel',
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

