import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID of the new owner',
  })
  @IsUUID('4', { message: 'New owner ID must be a valid UUID' })
  newOwnerId: string;
}

