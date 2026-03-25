import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for creating a new team invite code.
 */
export class CreateTeamInviteDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Maximum number of times the code can be used (null = unlimited)',
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Max uses must be at least 1' })
  maxUses?: number;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Expiration date for the invite code',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * DTO for joining a team with an invite code.
 */
export class JoinWithInviteCodeDto {
  @ApiProperty({
    example: 'ABC123',
    description: 'The 6-character invite code',
  })
  @IsString()
  code: string;
}

/**
 * DTO for updating an existing invite code.
 */
export class UpdateTeamInviteDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Whether the invite code is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 20,
    description: 'Maximum number of times the code can be used',
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Max uses must be at least 1' })
  maxUses?: number;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Expiration date for the invite code',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

