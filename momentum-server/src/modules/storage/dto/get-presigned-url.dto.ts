import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GetPresignedUrlDto {
  @ApiProperty({
    example: 'profile-photo.jpg',
    description: 'Original filename',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    example: 'avatars',
    description: 'Folder for the upload (avatars, headers, chat-media)',
  })
  @IsString()
  @IsNotEmpty()
  folder: string;
}

