import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateRoleTemplateDto {
  @ApiProperty({
    example: 'MODERATOR',
    description: 'Custom role name unique within the team',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: 'Can moderate channel messages and posts',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: ['messages.moderate', 'posts.moderate'],
    isArray: true,
    description: 'Permission codes to grant to this role template',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z]+(\.[a-z]+)+$/, {
    each: true,
    message: 'Each permission code must follow resource.action format',
  })
  permissions: string[];
}

