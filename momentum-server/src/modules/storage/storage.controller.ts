import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetPresignedUrlDto } from './dto/get-presigned-url.dto';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          enum: ['avatars', 'headers', 'chat-media'],
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedFolders = ['avatars', 'headers', 'chat-media'];
    if (!folder || !allowedFolders.includes(folder)) {
      throw new BadRequestException('Invalid folder. Must be one of: avatars, headers, chat-media');
    }

    const url = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder,
    );

    return { url };
  }

  @Post('presigned-url')
  @ApiOperation({ summary: 'Get a presigned URL for direct upload' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated' })
  async getPresignedUrl(@Body() getPresignedUrlDto: GetPresignedUrlDto) {
    const allowedFolders = ['avatars', 'headers', 'chat-media'];
    if (!allowedFolders.includes(getPresignedUrlDto.folder)) {
      throw new BadRequestException('Invalid folder. Must be one of: avatars, headers, chat-media');
    }

    return this.storageService.getPresignedUploadUrl(
      getPresignedUrlDto.fileName,
      getPresignedUrlDto.folder,
    );
  }
}

