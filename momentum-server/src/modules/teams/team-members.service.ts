import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Service for managing team members and their roles.
 */
@Injectable()
export class TeamMembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets a member's role in a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   * @returns The member's role or null if not a member.
   */
  async getMemberRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      select: { role: true },
    });

    return member?.role ?? null;
  }

  /**
   * Checks if a user is blocked in a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   * @returns True if user is blocked.
   */
  async isBlocked(teamId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      select: { isBlocked: true },
    });

    return member?.isBlocked ?? false;
  }

  /**
   * Checks if a user is a member and not blocked.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   * @returns True if user is an active (non-blocked) member.
   */
  async isActiveMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
      select: { isBlocked: true },
    });

    if (!member) return false;
    return !member.isBlocked;
  }

  /**
   * Checks if a user is a member of a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   * @returns True if user is a member.
   */
  async isMember(teamId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    return !!member;
  }

  /**
   * Checks if a user has admin privileges in a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   * @returns True if user is admin or owner.
   */
  async isAdminOrOwner(teamId: string, userId: string): Promise<boolean> {
    const role = await this.getMemberRole(teamId, userId);
    return role === TeamRole.ADMIN || role === TeamRole.OWNER;
  }

  /**
   * Gets all members of a team.
   *
   * @param teamId - The team ID.
   * @param userId - Optional user ID for access check.
   * @returns List of team members.
   */
  async getMembers(teamId: string, userId?: string) {
    // Check team privacy first
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.isPrivate) {
      if (!userId) {
        throw new ForbiddenException('This team is private');
      }

      const isMember = team.members.some((member) => member.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('This team is private');
      }
    }

    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: 'asc' },
      ],
    });
  }

  /**
   * Updates a member's role.
   *
   * @param teamId - The team ID.
   * @param targetUserId - The user to update.
   * @param newRole - The new role.
   * @param requesterId - The user making the request.
   */
  async updateRole(
    teamId: string,
    targetUserId: string,
    newRole: TeamRole,
    requesterId: string,
  ) {
    // Get requester's role
    const requesterRole = await this.getMemberRole(teamId, requesterId);

    if (!requesterRole) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Only owners can change roles
    if (requesterRole !== TeamRole.OWNER) {
      throw new ForbiddenException('Only the owner can change member roles');
    }

    // Cannot change owner's role
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (team?.ownerId === targetUserId && newRole !== TeamRole.OWNER) {
      throw new BadRequestException('Cannot change the owner\'s role. Transfer ownership first.');
    }

    // Cannot make someone else owner through role change
    if (newRole === TeamRole.OWNER) {
      throw new BadRequestException('Use transfer ownership to change the owner');
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: targetUserId },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Removes a member from a team.
   *
   * @param teamId - The team ID.
   * @param targetUserId - The user to remove.
   * @param requesterId - The user making the request.
   */
  async removeMember(teamId: string, targetUserId: string, requesterId: string) {
    // Get requester's role
    const requesterRole = await this.getMemberRole(teamId, requesterId);

    if (!requesterRole) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Only admins and owners can remove members
    if (requesterRole === TeamRole.MEMBER) {
      throw new ForbiddenException('Only admins and owners can remove members');
    }

    // Get target's role
    const targetRole = await this.getMemberRole(teamId, targetUserId);

    if (!targetRole) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove owner
    if (targetRole === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot remove the team owner');
    }

    // Admins cannot remove other admins (only owner can)
    if (requesterRole === TeamRole.ADMIN && targetRole === TeamRole.ADMIN) {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: targetUserId },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.teamMember.delete({
      where: { id: member.id },
    });

    return { message: 'Member removed successfully' };
  }

  /**
   * Transfers team ownership to another member.
   *
   * @param teamId - The team ID.
   * @param newOwnerId - The new owner's user ID.
   * @param currentOwnerId - The current owner's user ID.
   */
  async transferOwnership(teamId: string, newOwnerId: string, currentOwnerId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== currentOwnerId) {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }

    // Check if new owner is a member
    const newOwnerMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: newOwnerId },
      },
    });

    if (!newOwnerMember) {
      throw new NotFoundException('New owner must be a team member');
    }

    // Transaction: Update team owner and member roles
    await this.prisma.$transaction([
      // Update team owner
      this.prisma.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerId },
      }),
      // Set new owner's role
      this.prisma.teamMember.update({
        where: { id: newOwnerMember.id },
        data: { role: TeamRole.OWNER },
      }),
      // Demote old owner to admin
      this.prisma.teamMember.updateMany({
        where: {
          teamId,
          userId: currentOwnerId,
        },
        data: { role: TeamRole.ADMIN },
      }),
    ]);

    return { message: 'Ownership transferred successfully' };
  }

  /**
   * Gets member statistics within a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   * @returns Member statistics.
   */
  async getMemberStatistics(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Count completed habits in this team
    const completedHabits = await this.prisma.habitLog.count({
      where: {
        userId,
        status: 'COMPLETED',
        habit: {
          challenge: { teamId },
        },
      },
    });

    // Count partial habits
    const partialHabits = await this.prisma.habitLog.count({
      where: {
        userId,
        status: 'PARTIAL',
        habit: {
          challenge: { teamId },
        },
      },
    });

    // Calculate score (completed = 1 point, partial = 0.5 points)
    const globalScore = completedHabits + partialHabits * 0.5;

    return {
      userId,
      teamId,
      role: member.role,
      joinedAt: member.joinedAt,
      completedHabits,
      partialHabits,
      globalScore,
    };
  }

  /**
   * Blocks a member from accessing the team.
   *
   * @param teamId - The team ID.
   * @param targetUserId - The user to block.
   * @param requesterId - The user making the request.
   * @returns Updated member data.
   */
  async blockMember(teamId: string, targetUserId: string, requesterId: string) {
    // Get requester's role
    const requesterRole = await this.getMemberRole(teamId, requesterId);

    if (!requesterRole) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Only owners can block members
    if (requesterRole !== TeamRole.OWNER) {
      throw new ForbiddenException('Only the owner can block members');
    }

    // Get target's membership
    const targetMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // Cannot block owner
    if (targetMember.role === TeamRole.OWNER) {
      throw new ForbiddenException('Cannot block the team owner');
    }

    // Cannot block yourself
    if (targetUserId === requesterId) {
      throw new BadRequestException('Cannot block yourself');
    }

    return this.prisma.teamMember.update({
      where: { id: targetMember.id },
      data: { isBlocked: true },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });
  }

  /**
   * Unblocks a member, restoring their access to the team.
   *
   * @param teamId - The team ID.
   * @param targetUserId - The user to unblock.
   * @param requesterId - The user making the request.
   * @returns Updated member data.
   */
  async unblockMember(teamId: string, targetUserId: string, requesterId: string) {
    // Get requester's role
    const requesterRole = await this.getMemberRole(teamId, requesterId);

    if (!requesterRole) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Only owners can unblock members
    if (requesterRole !== TeamRole.OWNER) {
      throw new ForbiddenException('Only the owner can unblock members');
    }

    // Get target's membership
    const targetMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.teamMember.update({
      where: { id: targetMember.id },
      data: { isBlocked: false },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });
  }
}

