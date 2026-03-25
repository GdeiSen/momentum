import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TeamRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: TeamRole,
    example: TeamRole.ADMIN,
    description: 'New role for the member (MEMBER or ADMIN)',
  })
  @IsEnum(TeamRole, { message: 'Role must be a valid TeamRole' })
  role: TeamRole;
}

