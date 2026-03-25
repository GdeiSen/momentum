import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, Matches, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'NewNickname',
    description: 'New nickname (can only be changed once per month)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Nickname must be at least 3 characters long' })
  @MaxLength(30, { message: 'Nickname must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nickname can only contain letters, numbers, and underscores',
  })
  nickname?: string;

  @ApiPropertyOptional({
    example: 'Software developer passionate about habits and productivity',
    description: 'User bio/description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/avatars/user123.jpg',
    description: 'Avatar image URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/headers/user123.jpg',
    description: 'Header background image URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Header background URL must be a valid URL' })
  headerBgUrl?: string;
}

