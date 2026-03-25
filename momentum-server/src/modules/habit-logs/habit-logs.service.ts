import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { HabitLogStatus, TeamRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembersService } from '../teams/team-members.service';
import { CreateHabitLogDto } from './dto/create-habit-log.dto';
import { UpdateHabitLogDto } from './dto/update-habit-log.dto';
import { BulkUpdateHabitLogsDto } from './dto/bulk-update-habit-logs.dto';

/**
 * Service for managing habit completion logs.
 */
@Injectable()
export class HabitLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  /**
   * Creates or updates a habit log entry.
   *
   * @param userId - The user creating the log.
   * @param createHabitLogDto - Log creation data.
   * @returns Created or updated log.
   */
  async createOrUpdate(userId: string, createHabitLogDto: CreateHabitLogDto) {
    const { habitId, date, status, note, targetUserId } = createHabitLogDto;

    // Get habit and team info
    const habit = await this.prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        challenge: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!habit) {
      throw new NotFoundException('Habit not found');
    }

    const teamId = habit.challenge.teamId;
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    // Validate date is within challenge period
    const challengeStart = new Date(habit.challenge.startDate);
    const challengeEnd = new Date(habit.challenge.endDate);
    challengeStart.setHours(0, 0, 0, 0);
    challengeEnd.setHours(23, 59, 59, 999);

    if (logDate < challengeStart || logDate > challengeEnd) {
      throw new BadRequestException('Date must be within the challenge period');
    }

    // Determine the actual user for the log
    let actualUserId = userId;

    if (targetUserId && targetUserId !== userId) {
      // User is trying to log for someone else
      const userRole = await this.teamMembersService.getMemberRole(teamId, userId);

      if (!userRole) {
        throw new ForbiddenException('You are not a member of this team');
      }

      // Only admins/owners can set SKIPPED_EXCUSED for others
      if (status === HabitLogStatus.SKIPPED_EXCUSED) {
        if (userRole !== TeamRole.ADMIN && userRole !== TeamRole.OWNER) {
          throw new ForbiddenException(
            'Only admins and owners can mark habits as skipped (excused) for other users',
          );
        }
        actualUserId = targetUserId;
      } else {
        // Cannot set COMPLETED or PARTIAL for others
        throw new ForbiddenException('You can only mark your own habits as completed or partial');
      }
    } else {
      // User is logging for themselves
      const isMember = await this.teamMembersService.isMember(teamId, userId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this team');
      }

      // Regular members cannot set SKIPPED_EXCUSED for themselves
      if (status === HabitLogStatus.SKIPPED_EXCUSED) {
        const userRole = await this.teamMembersService.getMemberRole(teamId, userId);
        if (userRole === TeamRole.MEMBER) {
          throw new ForbiddenException(
            'Only admins and owners can mark habits as skipped (excused)',
          );
        }
      }
    }

    // Upsert the log
    const existingLog = await this.prisma.habitLog.findUnique({
      where: {
        habitId_userId_date: {
          habitId,
          userId: actualUserId,
          date: logDate,
        },
      },
    });

    if (existingLog) {
      return this.prisma.habitLog.update({
        where: { id: existingLog.id },
        data: {
          status,
          note,
        },
        include: {
          habit: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      });
    }

    return this.prisma.habitLog.create({
      data: {
        habitId,
        userId: actualUserId,
        date: logDate,
        status,
        note,
      },
      include: {
        habit: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
  }

  /**
   * Deletes a habit log (resets to empty).
   *
   * @param logId - The log ID.
   * @param userId - The user requesting deletion.
   */
  async delete(logId: string, userId: string) {
    const log = await this.prisma.habitLog.findUnique({
      where: { id: logId },
      include: {
        habit: {
          include: {
            challenge: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Habit log not found');
    }

    // Check permissions
    if (log.userId !== userId) {
      const isAdmin = await this.teamMembersService.isAdminOrOwner(
        log.habit.challenge.teamId,
        userId,
      );
      if (!isAdmin) {
        throw new ForbiddenException('You can only delete your own habit logs');
      }
    }

    await this.prisma.habitLog.delete({
      where: { id: logId },
    });

    return { message: 'Habit log deleted successfully' };
  }

  /**
   * Gets logs for a specific habit and user within a date range.
   *
   * @param habitId - The habit ID.
   * @param userId - The user ID.
   * @param startDate - Optional start date.
   * @param endDate - Optional end date.
   * @returns List of habit logs.
   */
  async findByHabitAndUser(
    habitId: string,
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    return this.prisma.habitLog.findMany({
      where: {
        habitId,
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Gets all logs for a challenge (for the habit table view).
   *
   * @param challengeId - The challenge ID.
   * @param targetUserId - Optional specific user to filter by.
   * @param requesterId - Optional requester ID for access check.
   * @returns All logs for the challenge organized by habit and date.
   */
  async findByChallengeForTable(challengeId: string, targetUserId?: string, requesterId?: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        habits: {
          orderBy: { createdAt: 'asc' },
        },
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

    if (challenge.team.isPrivate) {
      if (!requesterId) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
      const isMember = challenge.team.members.some((m) => m.userId === requesterId);
      if (!isMember) {
        throw new ForbiddenException('This challenge belongs to a private team');
      }
    }

    // Get logs
    const logsQuery: {
      habit: { challengeId: string };
      userId?: string;
    } = {
      habit: { challengeId },
    };

    if (targetUserId) {
      logsQuery.userId = targetUserId;
    }

    const logs = await this.prisma.habitLog.findMany({
      where: logsQuery,
      orderBy: { date: 'asc' },
    });

    // Organize logs by habitId -> date -> userId -> log
    // This allows proper handling of multiple users' logs for the same date
    const logsByHabitDateUser: Record<string, Record<string, Record<string, typeof logs[0]>>> = {};

    for (const log of logs) {
      const dateKey = log.date.toISOString().split('T')[0];
      if (!logsByHabitDateUser[log.habitId]) {
        logsByHabitDateUser[log.habitId] = {};
      }
      if (!logsByHabitDateUser[log.habitId][dateKey]) {
        logsByHabitDateUser[log.habitId][dateKey] = {};
      }
      logsByHabitDateUser[log.habitId][dateKey][log.userId] = log;
    }

    return {
      challenge: {
        id: challenge.id,
        title: challenge.title,
        startDate: challenge.startDate,
        endDate: challenge.endDate,
      },
      habits: challenge.habits,
      members: challenge.team.members.map((m) => m.user),
      logs: logsByHabitDateUser,
      targetUser: targetUserId || null,
    };
  }

  /**
   * Bulk update habit logs (for efficient table editing).
   *
   * @param userId - The user making the update.
   * @param bulkUpdateDto - Bulk update data.
   * @returns Updated logs.
   */
  async bulkUpdate(userId: string, bulkUpdateDto: BulkUpdateHabitLogsDto) {
    const results = [];

    for (const logData of bulkUpdateDto.logs) {
      try {
        const result = await this.createOrUpdate(userId, {
          habitId: logData.habitId,
          date: logData.date,
          status: logData.status,
          note: logData.note,
          targetUserId: logData.targetUserId,
        });
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({
          success: false,
          habitId: logData.habitId,
          date: logData.date,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Gets today's habits for a user (across all active challenges).
   *
   * @param userId - The user ID.
   * @returns List of habits to complete today with their status.
   */
  async getTodayHabits(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active challenges the user is part of
    const activeChallenges = await this.prisma.challenge.findMany({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
        team: {
          members: {
            some: { userId },
          },
        },
      },
      include: {
        habits: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get today's logs for this user
    const todayLogs = await this.prisma.habitLog.findMany({
      where: {
        userId,
        date: today,
      },
    });

    const logsMap = new Map(todayLogs.map((log) => [log.habitId, log]));

    // Build response
    const todayHabits = [];

    for (const challenge of activeChallenges) {
      for (const habit of challenge.habits) {
        const log = logsMap.get(habit.id);
        todayHabits.push({
          habit: {
            id: habit.id,
            title: habit.title,
            description: habit.description,
          },
          challenge: {
            id: challenge.id,
            title: challenge.title,
          },
          team: challenge.team,
          status: log?.status || null,
          logId: log?.id || null,
        });
      }
    }

    return todayHabits;
  }

  /**
   * Gets user's habit history with statistics.
   *
   * @param userId - The user ID.
   * @param days - Number of days to look back (default 30).
   * @returns Habit history with daily completion rates.
   */
  async getUserHistory(userId: string, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.habitLog.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        habit: {
          select: {
            id: true,
            title: true,
            challenge: {
              select: {
                id: true,
                title: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Group by date
    const byDate: Record<string, { completed: number; partial: number; total: number }> = {};

    for (const log of logs) {
      const dateKey = log.date.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { completed: 0, partial: 0, total: 0 };
      }
      byDate[dateKey].total++;
      if (log.status === 'COMPLETED') {
        byDate[dateKey].completed++;
      } else if (log.status === 'PARTIAL') {
        byDate[dateKey].partial++;
      }
    }

    return {
      logs,
      dailyStats: byDate,
      summary: {
        totalLogs: logs.length,
        completedCount: logs.filter((l) => l.status === 'COMPLETED').length,
        partialCount: logs.filter((l) => l.status === 'PARTIAL').length,
        skippedCount: logs.filter((l) => l.status === 'SKIPPED_EXCUSED').length,
      },
    };
  }
}

