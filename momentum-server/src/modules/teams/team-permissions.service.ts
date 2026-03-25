import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const LEGACY_ROLE_PERMISSION_MAP: Record<TeamRole, string[]> = {
  MEMBER: ['posts.create', 'workouts.log'],
  ADMIN: [
    'workspace.update',
    'workspace.analytics.view',
    'members.invite',
    'members.remove',
    'posts.create',
    'posts.moderate',
    'workouts.manage',
    'workouts.log',
  ],
  OWNER: ['*'],
};

@Injectable()
export class TeamPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      select: {
        id: true,
        role: true,
        isBlocked: true,
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this team');
    }

    if (member.isBlocked) {
      throw new ForbiddenException('You are blocked in this team');
    }

    return member;
  }

  async getEffectivePermissions(teamId: string, userId: string): Promise<string[]> {
    const teamMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      select: {
        id: true,
        role: true,
        isBlocked: true,
        roleAssignments: {
          select: {
            roleTemplate: {
              select: {
                permissions: {
                  select: {
                    permissionCode: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      throw new NotFoundException('You are not a member of this team');
    }

    if (teamMember.isBlocked) {
      throw new ForbiddenException('You are blocked in this team');
    }

    const permissionSet = new Set<string>(LEGACY_ROLE_PERMISSION_MAP[teamMember.role]);

    if (permissionSet.has('*')) {
      const allPermissions = await this.prisma.permission.findMany({
        select: { code: true },
      });

      allPermissions.forEach((permission) => permissionSet.add(permission.code));
    }

    teamMember.roleAssignments.forEach((assignment) => {
      assignment.roleTemplate.permissions.forEach((permission) => {
        permissionSet.add(permission.permissionCode);
      });
    });

    return [...permissionSet].sort();
  }

  async hasPermission(
    teamId: string,
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const effectivePermissions = await this.getEffectivePermissions(teamId, userId);
    return (
      effectivePermissions.includes(permissionCode) ||
      effectivePermissions.includes('*')
    );
  }

  async requirePermission(
    teamId: string,
    userId: string,
    permissionCode: string,
    message?: string,
  ): Promise<void> {
    const permitted = await this.hasPermission(teamId, userId, permissionCode);

    if (!permitted) {
      throw new ForbiddenException(
        message || `Missing required permission: ${permissionCode}`,
      );
    }
  }

  async getPermissionSnapshot(teamId: string, userId: string) {
    const member = await this.getTeamMember(teamId, userId);
    const permissions = await this.getEffectivePermissions(teamId, userId);

    return {
      teamId,
      userId,
      legacyRole: member.role,
      permissions,
    };
  }
}
