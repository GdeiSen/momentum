import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class UpdatePostDto {
  @ApiPropertyOptional({
    example: 'Updated Team Meeting Tomorrow',
    description: 'Post title',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Title must be at least 2 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated content...',
    description: 'Post content',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Content cannot be empty' })
  @MaxLength(10000, { message: 'Content must not exceed 10000 characters' })
  content?: string;

  @ApiPropertyOptional({
    example: ['https://example.com/image1.jpg'],
    description: 'Array of media URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}




