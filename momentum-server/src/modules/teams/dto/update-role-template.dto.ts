import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateRoleTemplateDto {
  @ApiPropertyOptional({
    example: 'CONTENT_MODERATOR',
    description: 'Updated custom role name',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    example: 'Can moderate messages, posts and reports',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: ['messages.moderate', 'posts.moderate', 'permissions.view'],
    isArray: true,
    description: 'Replacing full permission set for this role template',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-z]+(\.[a-z]+)+$/, {
    each: true,
    message: 'Each permission code must follow resource.action format',
  })
  permissions?: string[];
}

