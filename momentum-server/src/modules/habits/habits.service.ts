import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembersService } from '../teams/team-members.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';

/**
 * Service for managing habits within challenges.
 */
@Injectable()
export class HabitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  /**
   * Creates a new habit within a challenge.
   *
   * @param challengeId - The challenge ID.
   * @param userId - The creator's user ID (must be admin or owner).
   * @param createHabitDto - Habit creation data.
   * @returns Created habit.
   */
  async create(challengeId: string, userId: string, createHabitDto: CreateHabitDto) {
    // Get challenge to check team permissions
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check if user has admin privileges
    const isAdmin = await this.teamMembersService.isAdminOrOwner(challenge.teamId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins and owners can create habits');
    }

    return this.prisma.habit.create({
      data: {
        challengeId,
        title: createHabitDto.title,
        description: createHabitDto.description,
      },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            teamId: true,
          },
        },
        _count: {
          select: {
            logs: true,
          },
        },
      },
    });
  }

  /**
   * Finds all habits for a challenge.
   *
   * @param challengeId - The challenge ID.
   * @returns List of habits.
   */
  async findAllByChallenge(challengeId: string) {
    return this.prisma.habit.findMany({
      where: { challengeId },
      include: {
        _count: {
          select: {
            logs: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Finds a habit by ID.
   *
   * @param habitId - The habit ID.
   * @returns Habit data.
   */
  async findById(habitId: string) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            teamId: true,
            startDate: true,
            endDate: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            logs: true,
          },
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    return habit;
  }

  /**
   * Updates a habit.
   *
   * @param habitId - The habit ID.
   * @param userId - The user ID (must be admin or owner of the team).
   * @param updateHabitDto - Update data.
   * @returns Updated habit.
   */
  async update(habitId: string, userId: string, updateHabitDto: UpdateHabitDto) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        challenge: true,
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    // Check permissions
    const isAdmin = await this.teamMembersService.isAdminOrOwner(habit.challenge.teamId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins and owners can update habits');
    }

    // Convert empty strings to null for optional fields to allow deletion
    const updateData: {
      title?: string;
      description?: string | null;
    } = {
      title: updateHabitDto.title,
    };

    // Handle optional string fields: convert empty strings to null, undefined stays undefined
    if ('description' in updateHabitDto) {
      updateData.description = updateHabitDto.description === '' ? null : updateHabitDto.description;
    }

    return this.prisma.habit.update({
      where: { id: habitId },
      data: updateData,
      include: {
        challenge: {
          select: {
            id: true,
            title: true,
            teamId: true,
          },
        },
        _count: {
          select: {
            logs: true,
          },
        },
      },
    });
  }

  /**
   * Deletes a habit.
   *
   * @param habitId - The habit ID.
   * @param userId - The user ID (must be admin or owner of the team).
   */
  async delete(habitId: string, userId: string) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        challenge: true,
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    // Check permissions
    const isAdmin = await this.teamMembersService.isAdminOrOwner(habit.challenge.teamId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins and owners can delete habits');
    }

    await this.prisma.habit.delete({
      where: { id: habitId },
    });

    return { message: 'Habit deleted successfully' };
  }

  /**
   * Gets habit statistics.
   *
   * @param habitId - The habit ID.
   * @returns Habit statistics.
   */
  async getStatistics(habitId: string) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        challenge: {
          include: {
            team: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    const completedCount = await this.prisma.habitLog.count({
      where: {
        habitId,
        status: 'COMPLETED',
      },
    });

    const partialCount = await this.prisma.habitLog.count({
      where: {
        habitId,
        status: 'PARTIAL',
      },
    });

    const skippedCount = await this.prisma.habitLog.count({
      where: {
        habitId,
        status: 'SKIPPED_EXCUSED',
      },
    });

    // Calculate expected completions
    const startDate = new Date(habit.challenge.startDate);
    const endDate = new Date(habit.challenge.endDate);
    const now = new Date();
    const effectiveEndDate = now < endDate ? now : endDate;

    const daysElapsed = Math.max(
      0,
      Math.ceil((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const expectedCompletions = habit.challenge.team.members.length * daysElapsed;
    const completionRate = expectedCompletions > 0 ? (completedCount / expectedCompletions) * 100 : 0;

    return {
      habitId,
      completedCount,
      partialCount,
      skippedCount,
      totalLogs: completedCount + partialCount + skippedCount,
      participantsCount: habit.challenge.team.members.length,
      daysElapsed,
      expectedCompletions,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  /**
   * Gets leaderboard for a specific habit.
   *
   * @param habitId - The habit ID.
   * @returns Leaderboard with member scores for this habit.
   */
  async getLeaderboard(habitId: string) {
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        challenge: {
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
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    // Get scores for each member
    const leaderboard = await Promise.all(
      habit.challenge.team.members.map(async (member) => {
        const completedCount = await this.prisma.habitLog.count({
          where: {
            habitId,
            userId: member.userId,
            status: 'COMPLETED',
          },
        });

        const partialCount = await this.prisma.habitLog.count({
          where: {
            habitId,
            userId: member.userId,
            status: 'PARTIAL',
          },
        });

        // Calculate current streak for this habit
        const streak = await this.calculateHabitStreak(habitId, member.userId);

        const score = completedCount + partialCount * 0.5;

        return {
          user: member.user,
          completedCount,
          partialCount,
          currentStreak: streak,
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

  /**
   * Calculates the current streak for a user on a specific habit.
   *
   * @param habitId - The habit ID.
   * @param userId - The user ID.
   * @returns Number of consecutive days.
   */
  private async calculateHabitStreak(habitId: string, userId: string): Promise<number> {
    const logs = await this.prisma.habitLog.findMany({
      where: {
        habitId,
        userId,
        status: 'COMPLETED',
      },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (logs.length === 0) {
      return 0;
    }

    let streak = 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    let checkDate = yesterday;

    for (const log of logs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (logDate.getTime() < checkDate.getTime()) {
        break;
      }
    }

    return streak;
  }
}

