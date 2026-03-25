import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsArray, ArrayMinSize } from 'class-validator';

/**
 * DTO for adding a single email to whitelist.
 */
export class AddWhitelistEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to add to the whitelist',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}

/**
 * DTO for adding multiple emails to whitelist.
 */
export class AddBulkWhitelistEmailsDto {
  @ApiProperty({
    example: ['user1@example.com', 'user2@example.com'],
    description: 'List of email addresses to add to the whitelist',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one email is required' })
  @IsEmail({}, { each: true, message: 'Each item must be a valid email address' })
  emails: string[];
}

