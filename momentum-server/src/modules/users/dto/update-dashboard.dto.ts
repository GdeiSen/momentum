import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { Prisma } from '@prisma/client';

export class UpdateDashboardDto {
  @ApiProperty({
    example: [
      { id: 'widget-1', type: 'active-team', position: { x: 0, y: 0, w: 2, h: 1 } },
      { id: 'widget-2', type: 'current-streak', position: { x: 2, y: 0, w: 2, h: 1 } },
    ],
    description: 'Dashboard layout configuration (array of widget objects)',
  })
  @IsArray()
  layoutConfig: Prisma.InputJsonValue;
}

