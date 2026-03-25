import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing file uploads to MinIO (S3-compatible storage).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'momentum_admin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'momentum_secret_key'),
    });

    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'momentum-uploads');
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  /**
   * Ensures the storage bucket exists, creates it if not.
   */
  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        console.log(`✅ Created MinIO bucket: ${this.bucketName}`);

        // Set bucket policy to allow public read access for uploaded files
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        };

        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      }
    } catch (error) {
      console.error('Failed to initialize MinIO bucket:', error);
    }
  }

  /**
   * Uploads a file to storage.
   *
   * @param file - The file buffer.
   * @param originalName - Original filename.
   * @param mimeType - File MIME type.
   * @param folder - Folder path (e.g., 'avatars', 'headers', 'chat-media').
   * @returns The URL of the uploaded file.
   */
  async uploadFile(
    file: Buffer,
    originalName: string,
    mimeType: string,
    folder: string,
  ): Promise<string> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.length > maxSize) {
      throw new BadRequestException('File size exceeds maximum allowed (5MB).');
    }

    // Generate unique filename
    const extension = originalName.split('.').pop() || 'jpg';
    const fileName = `${folder}/${uuidv4()}.${extension}`;

    // Upload to MinIO
    await this.minioClient.putObject(this.bucketName, fileName, file, file.length, {
      'Content-Type': mimeType,
    });

    // Return public URL
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<string>('MINIO_PORT', '9000');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
  }

  /**
   * Generates a presigned URL for direct upload from client.
   *
   * @param fileName - The desired filename.
   * @param folder - Folder path.
   * @param expirySeconds - URL expiry time in seconds (default 3600).
   * @returns Presigned upload URL.
   */
  async getPresignedUploadUrl(
    fileName: string,
    folder: string,
    expirySeconds = 3600,
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    const extension = fileName.split('.').pop() || 'jpg';
    const objectName = `${folder}/${uuidv4()}.${extension}`;

    const uploadUrl = await this.minioClient.presignedPutObject(
      this.bucketName,
      objectName,
      expirySeconds,
    );

    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<string>('MINIO_PORT', '9000');
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSSL ? 'https' : 'http';

    const fileUrl = `${protocol}://${endpoint}:${port}/${this.bucketName}/${objectName}`;

    return { uploadUrl, fileUrl };
  }

  /**
   * Deletes a file from storage.
   *
   * @param fileUrl - The full URL of the file to delete.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract object name from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const objectName = pathParts.slice(2).join('/'); // Remove bucket name from path

      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Don't throw - file might not exist
    }
  }

  /**
   * Gets a presigned URL for downloading a file.
   *
   * @param objectName - The object name in storage.
   * @param expirySeconds - URL expiry time in seconds.
   * @returns Presigned download URL.
   */
  async getPresignedDownloadUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(this.bucketName, objectName, expirySeconds);
  }
}

