import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembersService } from './team-members.service';
import { CreateTeamInviteDto } from './dto/team-invite.dto';

/**
 * Generates a random alphanumeric code of specified length.
 *
 * @param length - The length of the code to generate.
 * @returns A random alphanumeric string.
 */
function generateInviteCode(length = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

/**
 * Service for managing team invite codes.
 */
@Injectable()
export class TeamInvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  /**
   * Creates a new invite code for a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user creating the invite (must be admin/owner).
   * @param createInviteDto - Invite creation data.
   * @returns The created invite.
   */
  async createInvite(
    teamId: string,
    userId: string,
    createInviteDto: CreateTeamInviteDto,
  ) {
    // Check permissions
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can create invite codes');
    }

    // Generate a unique code
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = generateInviteCode();
      const existingInvite = await this.prisma.teamInvite.findUnique({
        where: { code },
      });
      if (!existingInvite) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new BadRequestException('Failed to generate unique invite code. Please try again.');
    }

    return this.prisma.teamInvite.create({
      data: {
        teamId,
        code: code!,
        maxUses: createInviteDto.maxUses,
        expiresAt: createInviteDto.expiresAt ? new Date(createInviteDto.expiresAt) : null,
        createdBy: userId,
      },
    });
  }

  /**
   * Gets all invite codes for a team.
   *
   * @param teamId - The team ID.
   * @param userId - The requesting user (must be admin/owner).
   * @returns List of invite codes.
   */
  async getTeamInvites(teamId: string, userId: string) {
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can view invite codes');
    }

    return this.prisma.teamInvite.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validates an invite code and returns the team if valid.
   *
   * @param code - The invite code.
   * @returns The team associated with the code.
   */
  async validateInviteCode(code: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                members: true,
                challenges: true,
              },
            },
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if (!invite.isActive) {
      throw new BadRequestException('This invite code has been deactivated');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite code has expired');
    }

    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('This invite code has reached its maximum uses');
    }

    return invite.team;
  }

  /**
   * Joins a team using an invite code.
   *
   * @param code - The invite code.
   * @param userId - The user joining.
   * @param userEmail - The user's email (for whitelist check).
   * @returns Success message.
   */
  async joinWithInviteCode(code: string, userId: string, userEmail: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        team: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    if (!invite.isActive) {
      throw new BadRequestException('This invite code has been deactivated');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite code has expired');
    }

    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('This invite code has reached its maximum uses');
    }

    // Check if already a member
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: invite.teamId, userId },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this team');
    }

    // Check email whitelist if required
    if (invite.team.requireEmailWhitelist) {
      const isWhitelisted = await this.prisma.teamWhitelistEmail.findUnique({
        where: {
          teamId_email: { teamId: invite.teamId, email: userEmail.toLowerCase() },
        },
      });

      if (!isWhitelisted) {
        throw new ForbiddenException('Your email is not on the whitelist for this team');
      }
    }

    // Join the team and increment use count
    await this.prisma.$transaction([
      this.prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId,
          role: TeamRole.MEMBER,
        },
      }),
      this.prisma.teamInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return { message: 'Successfully joined the team' };
  }

  /**
   * Deactivates an invite code.
   *
   * @param teamId - The team ID.
   * @param inviteId - The invite ID.
   * @param userId - The requesting user (must be admin/owner).
   */
  async deactivateInvite(teamId: string, inviteId: string, userId: string) {
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can deactivate invite codes');
    }

    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.teamId !== teamId) {
      throw new NotFoundException('Invite code not found');
    }

    return this.prisma.teamInvite.update({
      where: { id: inviteId },
      data: { isActive: false },
    });
  }

  /**
   * Deletes an invite code.
   *
   * @param teamId - The team ID.
   * @param inviteId - The invite ID.
   * @param userId - The requesting user (must be admin/owner).
   */
  async deleteInvite(teamId: string, inviteId: string, userId: string) {
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can delete invite codes');
    }

    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.teamId !== teamId) {
      throw new NotFoundException('Invite code not found');
    }

    await this.prisma.teamInvite.delete({
      where: { id: inviteId },
    });

    return { message: 'Invite code deleted successfully' };
  }
}

