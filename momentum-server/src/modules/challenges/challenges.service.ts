import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembersService } from '../teams/team-members.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';

/**
 * Service for managing challenges (seasons/events within teams).
 */
@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  /**
   * Creates a new challenge within a team.
   *
   * @param teamId - The team ID.
   * @param userId - The creator's user ID (must be admin or owner).
   * @param createChallengeDto - Challenge creation data.
   * @returns Created challenge.
   */
  async create(teamId: string, userId: string, createChallengeDto: CreateChallengeDto) {
    // Check if user has admin privileges
    const isAdmin = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins and owners can create challenges');
    }

    // Validate dates
    const startDate = new Date(createChallengeDto.startDate);
    const endDate = new Date(createChallengeDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.challenge.create({
      data: {
        teamId,
        title: createChallengeDto.title,
        description: createChallengeDto.description,
        posterUrl: createChallengeDto.posterUrl,
        startDate,
        endDate,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        habits: true,
        _count: {
          select: {
            habits: true,
          },
        },
      },
    });
  }

  /**
   * Finds all challenges for a team.
   *
   * @param teamId - The team ID.
   * @param status - Optional filter by status (active, upcoming, past).
   * @param userId - Optional user ID for access check.
   * @returns List of challenges.
   */
  async findAllByTeam(teamId: string, status?: 'active' | 'upcoming' | 'past', userId?: string) {
    // Check team privacy
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { userId: true, isBlocked: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check if user is blocked
    if (userId) {
      const userMember = team.members.find((m) => m.userId === userId);
      if (userMember?.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
    }

    if (team.isPrivate) {
      if (!userId) {
        throw new ForbiddenException('This team is private');
      }
      const isMember = team.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('This team is private');
      }
    }

    const now = new Date();
    let dateFilter = {};

    if (status === 'active') {
      dateFilter = {
        startDate: { lte: now },
        endDate: { gte: now },
      };
    } else if (status === 'upcoming') {
      dateFilter = {
        startDate: { gt: now },
      };
    } else if (status === 'past') {
      dateFilter = {
        endDate: { lt: now },
      };
    }

    return this.prisma.challenge.findMany({
      where: {
        teamId,
        ...dateFilter,
      },
      include: {
        habits: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            habits: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Finds a challenge by ID.
   *
   * @param challengeId - The challenge ID.
   * @param userId - Optional user ID for access check.
   * @returns Challenge data with habits.
   */
  async findById(challengeId: string, userId?: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            isPrivate: true,
            members: {
              select: { userId: true, isBlocked: true },
            },
          },
        },
        habits: {
          include: {
            _count: {
              select: {
                logs: true,
              },
            },
          },
        },
        _count: {
          select: {
            habits: true,
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check if user is blocked
    if (userId) {
      const userMember = challenge.team.members.find((m) => m.userId === userId);
      if (userMember?.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
    }

    if (challenge.team.isPrivate) {
      if (!userId) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
      const isMember = challenge.team.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
    }

    return challenge;
  }

  /**
   * Updates a challenge.
   *
   * @param challengeId - The challenge ID.
   * @param userId - The user ID (must be admin or owner of the team).
   * @param updateChallengeDto - Update data.
   * @returns Updated challenge.
   */
  async update(challengeId: string, userId: string, updateChallengeDto: UpdateChallengeDto) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check permissions
    const isAdmin = await this.teamMembersService.isAdminOrOwner(challenge.teamId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins and owners can update challenges');
    }

    // Validate dates if provided
    if (updateChallengeDto.startDate || updateChallengeDto.endDate) {
      const startDate = updateChallengeDto.startDate
        ? new Date(updateChallengeDto.startDate)
        : challenge.startDate;
      const endDate = updateChallengeDto.endDate
        ? new Date(updateChallengeDto.endDate)
        : challenge.endDate;

      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Convert empty strings to null for optional fields to allow deletion
    const updateData: {
      title?: string;
      description?: string | null;
      posterUrl?: string | null;
      startDate?: Date;
      endDate?: Date;
    } = {
      title: updateChallengeDto.title,
    };

    // Handle optional string fields: convert empty strings to null, undefined stays undefined
    if ('description' in updateChallengeDto) {
      updateData.description = updateChallengeDto.description === '' ? null : updateChallengeDto.description;
    }
    if ('posterUrl' in updateChallengeDto) {
      updateData.posterUrl = updateChallengeDto.posterUrl === '' ? null : updateChallengeDto.posterUrl;
    }

    // Handle dates
    if (updateChallengeDto.startDate) {
      updateData.startDate = new Date(updateChallengeDto.startDate);
    }
    if (updateChallengeDto.endDate) {
      updateData.endDate = new Date(updateChallengeDto.endDate);
    }

    return this.prisma.challenge.update({
      where: { id: challengeId },
      data: updateData,
      include: {
        habits: true,
        _count: {
          select: {
            habits: true,
          },
        },
      },
    });
  }

  /**
   * Deletes a challenge.
   *
   * @param challengeId - The challenge ID.
   * @param userId - The user ID (must be admin or owner of the team).
   */
  async delete(challengeId: string, userId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check permissions
    const isAdmin = await this.teamMembersService.isAdminOrOwner(challenge.teamId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins and owners can delete challenges');
    }

    await this.prisma.challenge.delete({
      where: { id: challengeId },
    });

    return { message: 'Challenge deleted successfully' };
  }

  /**
   * Gets challenge statistics.
   *
   * @param challengeId - The challenge ID.
   * @param userId - Optional user ID for access check.
   * @returns Challenge statistics.
   */
  async getStatistics(challengeId: string, userId?: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        team: {
          include: {
            members: true,
          },
        },
        habits: true,
      },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check if user is blocked
    if (userId) {
      const userMember = challenge.team.members.find((m) => m.userId === userId);
      if (userMember?.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
    }

    if (challenge.team.isPrivate) {
      if (!userId) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
      const isMember = challenge.team.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
    }

    // Calculate total days in challenge
    const startDate = new Date(challenge.startDate);
    const endDate = new Date(challenge.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Count total habit logs
    const totalLogs = await this.prisma.habitLog.count({
      where: {
        habit: {
          challengeId,
        },
      },
    });

    const completedLogs = await this.prisma.habitLog.count({
      where: {
        habit: {
          challengeId,
        },
        status: 'COMPLETED',
      },
    });

    const partialLogs = await this.prisma.habitLog.count({
      where: {
        habit: {
          challengeId,
        },
        status: 'PARTIAL',
      },
    });

    const skippedLogs = await this.prisma.habitLog.count({
      where: {
        habit: {
          challengeId,
        },
        status: 'SKIPPED_EXCUSED',
      },
    });

    // Calculate expected logs (members * habits * days elapsed)
    const now = new Date();
    const effectiveEndDate = now < endDate ? now : endDate;
    const daysElapsed = Math.max(
      0,
      Math.ceil((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const expectedLogs = challenge.team.members.length * challenge.habits.length * daysElapsed;
    const completionRate = expectedLogs > 0 ? (completedLogs / expectedLogs) * 100 : 0;

    return {
      challengeId,
      totalDays,
      daysElapsed,
      habitsCount: challenge.habits.length,
      participantsCount: challenge.team.members.length,
      totalLogs,
      completedLogs,
      partialLogs,
      skippedLogs,
      completedCount: completedLogs,
      partialCount: partialLogs,
      skippedCount: skippedLogs,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  /**
   * Gets leaderboard for a challenge.
   *
   * @param challengeId - The challenge ID.
   * @param userId - Optional user ID for access check.
   * @returns Leaderboard with member scores.
   */
  async getLeaderboard(challengeId: string, userId?: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check if user is blocked
    if (userId) {
      const userMember = challenge.team.members.find((m) => m.userId === userId);
      if (userMember?.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
    }

    if (challenge.team.isPrivate) {
      if (!userId) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
      const isMember = challenge.team.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
    }

    // Get scores for each member
    const leaderboard = await Promise.all(
      challenge.team.members.map(async (member) => {
        const completedCount = await this.prisma.habitLog.count({
          where: {
            userId: member.userId,
            habit: { challengeId },
            status: 'COMPLETED',
          },
        });

        const partialCount = await this.prisma.habitLog.count({
          where: {
            userId: member.userId,
            habit: { challengeId },
            status: 'PARTIAL',
          },
        });

        const score = completedCount + partialCount * 0.5;

        return {
          user: member.user,
          completedCount,
          partialCount,
          score,
        };
      }),
    );

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // Add rank
    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  }
}

