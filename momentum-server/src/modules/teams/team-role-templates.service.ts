import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamPermissionsService } from './team-permissions.service';
import { CreateRoleTemplateDto } from './dto/create-role-template.dto';
import { UpdateRoleTemplateDto } from './dto/update-role-template.dto';

@Injectable()
export class TeamRoleTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamPermissionsService: TeamPermissionsService,
  ) {}

  async listTemplates(teamId: string, userId: string) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    return this.prisma.teamRoleTemplate.findMany({
      where: { teamId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
          orderBy: {
            permissionCode: 'asc',
          },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async createTemplate(
    teamId: string,
    userId: string,
    dto: CreateRoleTemplateDto,
  ) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'roles.manage',
      'Only members with roles.manage permission can create role templates',
    );

    const uniquePermissionCodes = [...new Set(dto.permissions)];

    const existingPermissions = await this.prisma.permission.findMany({
      where: {
        code: { in: uniquePermissionCodes },
      },
      select: { code: true },
    });

    if (existingPermissions.length !== uniquePermissionCodes.length) {
      const existingSet = new Set(existingPermissions.map((p) => p.code));
      const missingPermissions = uniquePermissionCodes.filter(
        (code) => !existingSet.has(code),
      );
      throw new BadRequestException(
        `Unknown permission codes: ${missingPermissions.join(', ')}`,
      );
    }

    try {
      return await this.prisma.teamRoleTemplate.create({
        data: {
          teamId,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          isSystem: false,
          createdBy: userId,
          permissions: {
            createMany: {
              data: uniquePermissionCodes.map((permissionCode) => ({
                permissionCode,
              })),
            },
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
            orderBy: {
              permissionCode: 'asc',
            },
          },
        },
      });
    } catch {
      throw new ConflictException(
        `Role template with name "${dto.name}" already exists in this team`,
      );
    }
  }

  async updateTemplate(
    teamId: string,
    roleTemplateId: string,
    userId: string,
    dto: UpdateRoleTemplateDto,
  ) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'roles.manage',
      'Only members with roles.manage permission can update role templates',
    );

    const template = await this.prisma.teamRoleTemplate.findFirst({
      where: {
        id: roleTemplateId,
        teamId,
      },
      include: {
        permissions: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Role template not found');
    }

    if (template.isSystem) {
      throw new ForbiddenException('System role templates cannot be updated');
    }

    const uniquePermissionCodes = dto.permissions
      ? [...new Set(dto.permissions)]
      : undefined;

    if (uniquePermissionCodes) {
      const existingPermissions = await this.prisma.permission.findMany({
        where: {
          code: { in: uniquePermissionCodes },
        },
        select: { code: true },
      });

      if (existingPermissions.length !== uniquePermissionCodes.length) {
        const existingSet = new Set(existingPermissions.map((p) => p.code));
        const missingPermissions = uniquePermissionCodes.filter(
          (code) => !existingSet.has(code),
        );
        throw new BadRequestException(
          `Unknown permission codes: ${missingPermissions.join(', ')}`,
        );
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.teamRoleTemplate.update({
          where: { id: roleTemplateId },
          data: {
            name: dto.name?.trim(),
            description:
              dto.description !== undefined ? dto.description.trim() : undefined,
          },
        });

        if (uniquePermissionCodes) {
          await tx.teamRolePermission.deleteMany({
            where: {
              roleTemplateId,
            },
          });

          if (uniquePermissionCodes.length > 0) {
            await tx.teamRolePermission.createMany({
              data: uniquePermissionCodes.map((permissionCode) => ({
                roleTemplateId,
                permissionCode,
              })),
            });
          }
        }
      });
    } catch {
      throw new ConflictException(
        `Role template with name "${dto.name}" already exists in this team`,
      );
    }

    return this.prisma.teamRoleTemplate.findUnique({
      where: { id: roleTemplateId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
          orderBy: {
            permissionCode: 'asc',
          },
        },
      },
    });
  }

  async deleteTemplate(teamId: string, roleTemplateId: string, userId: string) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'roles.manage',
      'Only members with roles.manage permission can delete role templates',
    );

    const template = await this.prisma.teamRoleTemplate.findFirst({
      where: {
        id: roleTemplateId,
        teamId,
      },
    });

    if (!template) {
      throw new NotFoundException('Role template not found');
    }

    if (template.isSystem) {
      throw new ForbiddenException('System role templates cannot be deleted');
    }

    await this.prisma.teamRoleTemplate.delete({
      where: { id: roleTemplateId },
    });

    return { message: 'Role template deleted successfully' };
  }

  async assignTemplateToMember(
    teamId: string,
    targetUserId: string,
    roleTemplateId: string,
    requesterId: string,
  ) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      requesterId,
      'roles.assign',
      'Only members with roles.assign permission can assign role templates',
    );

    const [roleTemplate, targetMember] = await Promise.all([
      this.prisma.teamRoleTemplate.findFirst({
        where: {
          id: roleTemplateId,
          teamId,
        },
      }),
      this.prisma.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: targetUserId },
        },
      }),
    ]);

    if (!roleTemplate) {
      throw new NotFoundException('Role template not found');
    }

    if (!targetMember) {
      throw new NotFoundException('Target member not found');
    }

    try {
      return await this.prisma.teamMemberRoleAssignment.create({
        data: {
          teamMemberId: targetMember.id,
          roleTemplateId,
          assignedBy: requesterId,
        },
        include: {
          roleTemplate: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });
    } catch {
      throw new ConflictException('Role template is already assigned to this member');
    }
  }

  async unassignTemplateFromMember(
    teamId: string,
    targetUserId: string,
    roleTemplateId: string,
    requesterId: string,
  ) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      requesterId,
      'roles.assign',
      'Only members with roles.assign permission can unassign role templates',
    );

    const targetMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: targetUserId },
      },
      select: {
        id: true,
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Target member not found');
    }

    const assignment = await this.prisma.teamMemberRoleAssignment.findUnique({
      where: {
        teamMemberId_roleTemplateId: {
          teamMemberId: targetMember.id,
          roleTemplateId,
        },
      },
      include: {
        roleTemplate: true,
      },
    });

    if (!assignment || assignment.roleTemplate.teamId !== teamId) {
      throw new NotFoundException('Role assignment not found');
    }

    if (assignment.roleTemplate.isSystem) {
      throw new ForbiddenException('System role templates cannot be unassigned');
    }

    await this.prisma.teamMemberRoleAssignment.delete({
      where: {
        teamMemberId_roleTemplateId: {
          teamMemberId: targetMember.id,
          roleTemplateId,
        },
      },
    });

    return { message: 'Role template unassigned successfully' };
  }

  async getMemberPermissionSnapshot(
    teamId: string,
    targetUserId: string,
    requesterId: string,
  ) {
    if (targetUserId !== requesterId) {
      await this.teamPermissionsService.requirePermission(
        teamId,
        requesterId,
        'permissions.view',
        'Only members with permissions.view can inspect other members permissions',
      );
    } else {
      await this.teamPermissionsService.getTeamMember(teamId, requesterId);
    }

    const effectivePermissions = await this.teamPermissionsService.getEffectivePermissions(
      teamId,
      targetUserId,
    );

    const targetMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: targetUserId },
      },
      select: {
        role: true,
        roleAssignments: {
          include: {
            roleTemplate: {
              select: {
                id: true,
                name: true,
                isSystem: true,
              },
            },
          },
        },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Target member not found');
    }

    return {
      teamId,
      userId: targetUserId,
      legacyRole: targetMember.role,
      roleTemplates: targetMember.roleAssignments.map((assignment) => assignment.roleTemplate),
      permissions: effectivePermissions,
    };
  }
}
