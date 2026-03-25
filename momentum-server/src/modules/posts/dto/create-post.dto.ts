import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    example: 'Team Meeting Tomorrow',
    description: 'Post title',
  })
  @IsString()
  @MinLength(2, { message: 'Title must be at least 2 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @ApiProperty({
    example: 'We will discuss the progress of our current challenge...',
    description: 'Post content',
  })
  @IsString()
  @MinLength(1, { message: 'Content cannot be empty' })
  @MaxLength(10000, { message: 'Content must not exceed 10000 characters' })
  content: string;

  @ApiPropertyOptional({
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    description: 'Array of media URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];
}




