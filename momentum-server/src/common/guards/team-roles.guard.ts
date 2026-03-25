import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeamRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that checks if the user has the required team role.
 * Expects teamId to be in the route params.
 *
 * @example
 * ```typescript
 * @Roles(TeamRole.ADMIN, TeamRole.OWNER)
 * @UseGuards(JwtAuthGuard, TeamRolesGuard)
 * @Delete(':teamId')
 * deleteTeam(@Param('teamId') teamId: string) {
 *   // Only admins and owners can access
 * }
 * ```
 */
@Injectable()
export class TeamRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<TeamRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get teamId from route params
    const teamId = request.params.teamId;
    if (!teamId) {
      throw new ForbiddenException('Team ID not found in request');
    }

    // Get user's role in the team
    const teamMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });

    if (!teamMember) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Check if user's role is in the required roles
    if (!requiredRoles.includes(teamMember.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    // Attach team member info to request for later use
    request.teamMember = teamMember;

    return true;
  }
}

