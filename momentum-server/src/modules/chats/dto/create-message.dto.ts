import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    example: 'Hello team! How is everyone doing?',
    description: 'Message content',
  })
  @IsString()
  @MinLength(1, { message: 'Message content cannot be empty' })
  @MaxLength(5000, { message: 'Message content must not exceed 5000 characters' })
  content: string;

  @ApiPropertyOptional({
    example: 'https://example.com/image.jpg',
    description: 'Optional media URL',
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}




