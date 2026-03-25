import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleTemplateDto {
  @ApiProperty({
    description: 'Role template ID to assign',
    format: 'uuid',
  })
  @IsUUID()
  roleTemplateId: string;
}

