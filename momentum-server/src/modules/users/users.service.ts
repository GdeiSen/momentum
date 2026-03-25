import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';

/**
 * Service for managing user profiles and related data.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a user by ID.
   *
   * @param userId - The user ID.
   * @returns User data without sensitive fields.
   * @throws NotFoundException if user not found.
   */
  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        headerBgUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Finds a user by nickname (public profile).
   *
   * @param nickname - The user nickname.
   * @returns Public user data.
   * @throws NotFoundException if user not found.
   */
  async findByNickname(nickname: string) {
    const user = await this.prisma.user.findUnique({
      where: { nickname },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        headerBgUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Updates user profile.
   *
   * @param userId - The user ID.
   * @param updateProfileDto - Profile update data.
   * @returns Updated user data.
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check nickname uniqueness and change limit (once per month)
    if (updateProfileDto.nickname && updateProfileDto.nickname !== user.nickname) {
      // Check if nickname is already taken
      const existingUser = await this.prisma.user.findUnique({
        where: { nickname: updateProfileDto.nickname },
      });

      if (existingUser) {
        throw new ConflictException('Nickname is already taken');
      }

      // Check nickname change cooldown (30 days)
      if (user.nicknameChangedAt) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        if (user.nicknameChangedAt > thirtyDaysAgo) {
          const nextChangeDate = new Date(user.nicknameChangedAt);
          nextChangeDate.setDate(nextChangeDate.getDate() + 30);
          throw new BadRequestException(
            `Nickname can only be changed once per month. Next change available: ${nextChangeDate.toISOString()}`,
          );
        }
      }
    }

    const updateData: {
      nickname?: string;
      bio?: string;
      avatarUrl?: string;
      headerBgUrl?: string;
      nicknameChangedAt?: Date;
    } = {};

    if (updateProfileDto.nickname && updateProfileDto.nickname !== user.nickname) {
      updateData.nickname = updateProfileDto.nickname;
      updateData.nicknameChangedAt = new Date();
    }

    if (updateProfileDto.bio !== undefined) {
      updateData.bio = updateProfileDto.bio;
    }

    if (updateProfileDto.avatarUrl !== undefined) {
      updateData.avatarUrl = updateProfileDto.avatarUrl;
    }

    if (updateProfileDto.headerBgUrl !== undefined) {
      updateData.headerBgUrl = updateProfileDto.headerBgUrl;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        headerBgUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Changes user password.
   *
   * @param userId - The user ID.
   * @param changePasswordDto - Current and new password.
   * @throws BadRequestException if current password is incorrect.
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(user.passwordHash, changePasswordDto.currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await argon2.hash(changePasswordDto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Gets user dashboard configuration.
   *
   * @param userId - The user ID.
   * @returns Dashboard configuration.
   */
  async getDashboard(userId: string) {
    let dashboard = await this.prisma.userDashboard.findUnique({
      where: { userId },
    });

    if (!dashboard) {
      // Create default dashboard
      dashboard = await this.prisma.userDashboard.create({
        data: {
          userId,
          layoutConfig: [],
        },
      });
    }

    return dashboard;
  }

  /**
   * Updates user dashboard configuration.
   *
   * @param userId - The user ID.
   * @param updateDashboardDto - Dashboard layout configuration.
   * @returns Updated dashboard.
   */
  async updateDashboard(userId: string, updateDashboardDto: UpdateDashboardDto) {
    const existingDashboard = await this.prisma.userDashboard.findUnique({
      where: { userId },
    });

    if (existingDashboard) {
      return this.prisma.userDashboard.update({
        where: { userId },
        data: { layoutConfig: updateDashboardDto.layoutConfig },
      });
    }

    return this.prisma.userDashboard.create({
      data: {
        userId,
        layoutConfig: updateDashboardDto.layoutConfig,
      },
    });
  }

  /**
   * Gets user statistics (for profile widgets).
   *
   * @param userId - The user ID.
   * @returns User statistics.
   */
  async getStatistics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count teams
    const teamsCount = await this.prisma.teamMember.count({
      where: { userId },
    });

    // Count completed habits
    const completedHabitsCount = await this.prisma.habitLog.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    // Count participated challenges
    const challengesCount = await this.prisma.challenge.count({
      where: {
        team: {
          members: {
            some: { userId },
          },
        },
      },
    });

    // Calculate current streak (consecutive days with at least one completed habit)
    const currentStreak = await this.calculateCurrentStreak(userId);

    return {
      teamsCount,
      completedHabitsCount,
      challengesCount,
      currentStreak,
    };
  }

  /**
   * Calculates the current completion streak for a user.
   *
   * @param userId - The user ID.
   * @returns Number of consecutive days with completed habits.
   */
  private async calculateCurrentStreak(userId: string): Promise<number> {
    const logs = await this.prisma.habitLog.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (logs.length === 0) {
      return 0;
    }

    // Get unique dates
    const uniqueDates = [...new Set(logs.map((log) => log.date.toISOString().split('T')[0]))];
    uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Start from yesterday (today might not be completed yet)
    let checkDate = yesterday;

    for (const dateStr of uniqueDates) {
      const logDate = new Date(dateStr);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (logDate.getTime() < checkDate.getTime()) {
        // Gap in dates, streak broken
        break;
      }
      // If logDate > checkDate, it's today or future, skip
    }

    return streak;
  }
}

