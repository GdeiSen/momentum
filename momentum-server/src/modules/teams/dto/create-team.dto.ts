import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, IsUrl, ValidateIf } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    example: 'Productivity Masters',
    description: 'Team name',
  })
  @IsString()
  @MinLength(2, { message: 'Team name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Team name must not exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'Building habits, one day at a time',
    description: 'Team slogan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Slogan must not exceed 200 characters' })
  slogan?: string;

  @ApiPropertyOptional({
    example: 'A team dedicated to building positive habits and achieving goals together.',
    description: 'Team description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/headers/team123.jpg',
    description: 'Header background image URL',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.headerBgUrl !== '' && o.headerBgUrl != null)
  @IsUrl({}, { message: 'Header background URL must be a valid URL' })
  headerBgUrl?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the team is private (invite-only)',
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether joining requires an invite code',
  })
  @IsOptional()
  @IsBoolean()
  requireInviteCode?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether joining requires email to be in whitelist',
  })
  @IsOptional()
  @IsBoolean()
  requireEmailWhitelist?: boolean;
}

