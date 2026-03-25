import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamMembersService } from './team-members.service';
import { TeamChannelsService } from './team-channels.service';

const BASELINE_PERMISSIONS: Array<{ code: string; description: string }> = [
  { code: 'roles.manage', description: 'Create, update and delete custom role templates.' },
  { code: 'roles.assign', description: 'Assign and unassign role templates to team members.' },
  { code: 'permissions.view', description: 'View effective permissions in a team.' },
  { code: 'channels.create', description: 'Create team channels.' },
  { code: 'channels.manage', description: 'Manage team channels and access rules.' },
  { code: 'messages.moderate', description: 'Moderate team messages.' },
  { code: 'workouts.manage', description: 'Create, update and delete team workouts.' },
  { code: 'workouts.log', description: 'Log personal workout results in a team.' },
  { code: 'members.invite', description: 'Invite users into team.' },
  { code: 'members.remove', description: 'Remove members from team.' },
  { code: 'members.block', description: 'Block and unblock team members.' },
  { code: 'posts.create', description: 'Create posts in team feed.' },
  { code: 'posts.moderate', description: 'Moderate team posts.' },
  { code: 'workspace.update', description: 'Update workspace/team settings.' },
  { code: 'workspace.analytics.view', description: 'View team analytics and statistics.' },
];

const SYSTEM_OWNER_ROLE = 'OWNER_SYSTEM';
const SYSTEM_ADMIN_ROLE = 'ADMIN_SYSTEM';
const SYSTEM_MEMBER_ROLE = 'MEMBER_SYSTEM';

const SYSTEM_ADMIN_PERMISSION_CODES = [
  'workspace.update',
  'workspace.analytics.view',
  'members.invite',
  'members.remove',
  'members.block',
  'posts.create',
  'posts.moderate',
  'channels.create',
  'channels.manage',
  'messages.moderate',
  'workouts.manage',
  'workouts.log',
  'permissions.view',
  'roles.assign',
];

const SYSTEM_MEMBER_PERMISSION_CODES = ['posts.create', 'workouts.log'];

/**
 * Service for managing teams.
 */
@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
    private readonly teamChannelsService: TeamChannelsService,
  ) {}

  /**
   * Creates a new team.
   *
   * @param userId - The creator's user ID (becomes owner).
   * @param createTeamDto - Team creation data.
   * @returns Created team with owner as member.
   */
  async create(userId: string, createTeamDto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: {
        name: createTeamDto.name,
        slogan: createTeamDto.slogan,
        description: createTeamDto.description,
        headerBgUrl: createTeamDto.headerBgUrl,
        isPrivate: createTeamDto.isPrivate ?? false,
        ownerId: userId,
        // Add creator as owner member
        members: {
          create: {
            userId,
            role: TeamRole.OWNER,
          },
        },
        // Create chat for the team
        chat: {
          create: {},
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
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
        _count: {
          select: {
            members: true,
            challenges: true,
          },
        },
      },
    });

    const ownerMember = team.members.find((member) => member.userId === userId);
    if (ownerMember) {
      await this.ensureTeamRbacFoundation(team.id, userId, ownerMember.id);
    }
    await this.teamChannelsService.ensureDefaultChannels(team.id, userId);

    return team;
  }

  private async ensureTeamRbacFoundation(
    teamId: string,
    ownerId: string,
    ownerMemberId: string,
  ) {
    for (const permission of BASELINE_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: {
          code: permission.code,
          description: permission.description,
        },
      });
    }

    const ownerTemplate = await this.prisma.teamRoleTemplate.upsert({
      where: {
        teamId_name: {
          teamId,
          name: SYSTEM_OWNER_ROLE,
        },
      },
      update: {
        isSystem: true,
      },
      create: {
        teamId,
        name: SYSTEM_OWNER_ROLE,
        description: 'System owner role template',
        isSystem: true,
        createdBy: ownerId,
      },
      select: { id: true },
    });

    const adminTemplate = await this.prisma.teamRoleTemplate.upsert({
      where: {
        teamId_name: {
          teamId,
          name: SYSTEM_ADMIN_ROLE,
        },
      },
      update: {
        isSystem: true,
      },
      create: {
        teamId,
        name: SYSTEM_ADMIN_ROLE,
        description: 'System admin role template',
        isSystem: true,
        createdBy: ownerId,
      },
      select: { id: true },
    });

    const memberTemplate = await this.prisma.teamRoleTemplate.upsert({
      where: {
        teamId_name: {
          teamId,
          name: SYSTEM_MEMBER_ROLE,
        },
      },
      update: {
        isSystem: true,
      },
      create: {
        teamId,
        name: SYSTEM_MEMBER_ROLE,
        description: 'System member role template',
        isSystem: true,
        createdBy: ownerId,
      },
      select: { id: true },
    });

    await this.syncTemplatePermissions(
      ownerTemplate.id,
      BASELINE_PERMISSIONS.map((permission) => permission.code),
    );
    await this.syncTemplatePermissions(adminTemplate.id, SYSTEM_ADMIN_PERMISSION_CODES);
    await this.syncTemplatePermissions(memberTemplate.id, SYSTEM_MEMBER_PERMISSION_CODES);

    await this.prisma.teamMemberRoleAssignment.upsert({
      where: {
        teamMemberId_roleTemplateId: {
          teamMemberId: ownerMemberId,
          roleTemplateId: ownerTemplate.id,
        },
      },
      update: {},
      create: {
        teamMemberId: ownerMemberId,
        roleTemplateId: ownerTemplate.id,
        assignedBy: ownerId,
      },
    });
  }

  private async syncTemplatePermissions(roleTemplateId: string, permissionCodes: string[]) {
    await this.prisma.teamRolePermission.deleteMany({
      where: {
        roleTemplateId,
        permissionCode: {
          notIn: permissionCodes,
        },
      },
    });

    for (const permissionCode of permissionCodes) {
      await this.prisma.teamRolePermission.upsert({
        where: {
          roleTemplateId_permissionCode: {
            roleTemplateId,
            permissionCode,
          },
        },
        update: {},
        create: {
          roleTemplateId,
          permissionCode,
        },
      });
    }
  }

  /**
   * Finds all teams (public teams or teams user is member of).
   *
   * @param userId - Optional user ID for filtering.
   * @param includePrivate - Whether to include private teams (only if user is member).
   * @returns List of teams.
   */
  async findAll(userId?: string, includePrivate = false) {
    const whereClause: {
      OR?: Array<{ isPrivate: boolean } | { members: { some: { userId: string } } }>;
      isPrivate?: boolean;
    } = {};

    if (userId && includePrivate) {
      whereClause.OR = [
        { isPrivate: false },
        { members: { some: { userId } } },
      ];
    } else {
      whereClause.isPrivate = false;
    }

    return this.prisma.team.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds teams that a user is a member of.
   *
   * @param userId - The user ID.
   * @returns List of teams.
   */
  async findUserTeams(userId: string) {
    return this.prisma.team.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        members: {
          where: { userId },
          select: { role: true },
        },
        _count: {
          select: {
            members: true,
            challenges: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds a team by ID.
   *
   * @param teamId - The team ID.
   * @param userId - Optional user ID for access check.
   * @returns Team data.
   * @throws NotFoundException if team not found.
   * @throws ForbiddenException if team is private and user is not a member, or if user is blocked.
   */
  async findById(teamId: string, userId?: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
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
          orderBy: { joinedAt: 'asc' },
        },
        challenges: {
          orderBy: { startDate: 'desc' },
        },
        chat: {
          select: { id: true },
        },
        _count: {
          select: {
            members: true,
            challenges: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Check access for private teams
    if (team.isPrivate) {
      if (!userId) {
        throw new ForbiddenException('This team is private');
      }

      const userMember = team.members.find((member) => member.userId === userId);
      if (!userMember) {
        throw new ForbiddenException('This team is private');
      }

      // Check if user is blocked
      if (userMember.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
    } else if (userId) {
      // For public teams, also check if user is blocked (if they are a member)
      const userMember = team.members.find((member) => member.userId === userId);
      if (userMember?.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
    }

    return team;
  }

  /**
   * Updates a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID (must be admin or owner).
   * @param updateTeamDto - Update data.
   * @returns Updated team.
   */
  async update(teamId: string, userId: string, updateTeamDto: UpdateTeamDto) {
    // Check permissions
    const memberRole = await this.teamMembersService.getMemberRole(teamId, userId);

    if (!memberRole || memberRole === TeamRole.MEMBER) {
      throw new ForbiddenException('Only admins and owners can update team settings');
    }

    // Convert empty strings to null for optional fields to allow deletion
    const updateData: {
      name?: string;
      slogan?: string | null;
      description?: string | null;
      headerBgUrl?: string | null;
      isPrivate?: boolean;
      requireInviteCode?: boolean;
      requireEmailWhitelist?: boolean;
    } = {
      name: updateTeamDto.name,
      isPrivate: updateTeamDto.isPrivate,
      requireInviteCode: updateTeamDto.requireInviteCode,
      requireEmailWhitelist: updateTeamDto.requireEmailWhitelist,
    };

    // Handle optional string fields: convert empty strings to null, undefined stays undefined
    if ('slogan' in updateTeamDto) {
      updateData.slogan = updateTeamDto.slogan === '' ? null : updateTeamDto.slogan;
    }
    if ('description' in updateTeamDto) {
      updateData.description = updateTeamDto.description === '' ? null : updateTeamDto.description;
    }
    if ('headerBgUrl' in updateTeamDto) {
      updateData.headerBgUrl = updateTeamDto.headerBgUrl === '' ? null : updateTeamDto.headerBgUrl;
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: updateData,
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
    });
  }

  /**
   * Deletes a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID (must be owner).
   */
  async delete(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete the team');
    }

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return { message: 'Team deleted successfully' };
  }

  /**
   * Allows a user to join a public team without invite code.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   * @param userEmail - The user's email (for whitelist check).
   */
  async join(teamId: string, userId: string, userEmail?: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.isPrivate) {
      throw new ForbiddenException('Cannot join a private team without invitation');
    }

    if (team.requireInviteCode) {
      throw new ForbiddenException('This team requires an invite code to join');
    }

    // Check email whitelist if required
    if (team.requireEmailWhitelist && userEmail) {
      const isWhitelisted = await this.prisma.teamWhitelistEmail.findUnique({
        where: {
          teamId_email: { teamId, email: userEmail.toLowerCase() },
        },
      });

      if (!isWhitelisted) {
        throw new ForbiddenException('Your email is not on the whitelist for this team');
      }
    }

    // Check if already a member
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this team');
    }

    await this.prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: TeamRole.MEMBER,
      },
    });

    return { message: 'Successfully joined the team' };
  }

  /**
   * Allows a user to leave a team.
   *
   * @param teamId - The team ID.
   * @param userId - The user ID.
   */
  async leave(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId === userId) {
      throw new ForbiddenException('Owner cannot leave the team. Transfer ownership or delete the team.');
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this team');
    }

    await this.prisma.teamMember.delete({
      where: { id: member.id },
    });

    return { message: 'Successfully left the team' };
  }

  /**
   * Gets team statistics.
   *
   * @param teamId - The team ID.
   * @param userId - Optional user ID for access check.
   * @returns Team statistics.
   */
  async getStatistics(teamId: string, userId?: string) {
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
      const userMember = team.members.find((member) => member.userId === userId);
      if (userMember?.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
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

    const membersCount = await this.prisma.teamMember.count({
      where: { teamId },
    });

    const challengesCount = await this.prisma.challenge.count({
      where: { teamId },
    });

    const activeChallenges = await this.prisma.challenge.count({
      where: {
        teamId,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const totalHabitLogs = await this.prisma.habitLog.count({
      where: {
        habit: {
          challenge: { teamId },
        },
        status: 'COMPLETED',
      },
    });

    return {
      membersCount,
      challengesCount,
      activeChallenges,
      totalCompletedHabits: totalHabitLogs,
    };
  }

  /**
   * Gets team activity data grouped by time periods.
   * Returns completed habit logs count grouped by day/week/month based on scope.
   *
   * @param teamId - The team ID.
   * @param scope - Time scope: 'week', 'month', or 'year'.
   * @param referenceDate - Reference date for the period.
   * @param userId - Optional user ID for access check.
   * @returns Array of activity data points with date and count.
   */
  async getActivityData(
    teamId: string,
    scope: 'week' | 'month' | 'year',
    referenceDate: Date,
    userId?: string,
  ) {
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
      const userMember = team.members.find((member) => member.userId === userId);
      if (userMember?.isBlocked) {
        throw new ForbiddenException('You have been blocked from this team');
      }
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

    // Calculate period boundaries
    let periodStart: Date;
    let periodEnd: Date;

    if (scope === 'week') {
      // Get Monday of the week
      const dayOfWeek = referenceDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(referenceDate);
      periodStart.setDate(referenceDate.getDate() - daysToMonday);
      periodStart.setHours(0, 0, 0, 0);
      // periodEnd is Sunday (last day of week) - use next day and then use lt
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 7);
      periodEnd.setHours(0, 0, 0, 0);
    } else if (scope === 'month') {
      const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      // periodEnd is first day of next month (use lt in query)
      periodEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
      periodEnd.setHours(0, 0, 0, 0);
      
      // Store original month start for week calculation
      const originalMonthStart = new Date(monthStart);
      
      periodStart = monthStart;
    } else {
      // Year scope
      periodStart = new Date(referenceDate.getFullYear(), 0, 1);
      periodStart.setHours(0, 0, 0, 0);
      // periodEnd is first day of next year (use lt in query)
      periodEnd = new Date(referenceDate.getFullYear() + 1, 0, 1);
      periodEnd.setHours(0, 0, 0, 0);
    }

    // Ensure period doesn't start before team creation
    // But only adjust if team was created during the selected period
    const teamCreated = new Date(team.createdAt);
    teamCreated.setHours(0, 0, 0, 0);
    
    // Store original period start for week calculation (before adjusting for team creation)
    const originalPeriodStart = scope === 'month' 
      ? new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
      : new Date(periodStart);
    originalPeriodStart.setHours(0, 0, 0, 0);
    
    // Only adjust periodStart if team was created after the period start
    // This allows showing data for the full selected period if team existed before it
    if (periodStart < teamCreated && teamCreated < periodEnd) {
      periodStart = new Date(teamCreated);
    }

    // Get all completed habit logs for the team within the period
    // Use only COMPLETED to match getStatistics behavior (user can see totalCompletedHabits = 34)
    // Note: We could include PARTIAL with 0.5 points, but for consistency with statistics, using only COMPLETED
    const normalizedPeriodStart = new Date(periodStart);
    normalizedPeriodStart.setHours(0, 0, 0, 0);
    const normalizedPeriodEnd = new Date(periodEnd);
    normalizedPeriodEnd.setHours(0, 0, 0, 0);

    const logs = await this.prisma.habitLog.findMany({
      where: {
        habit: {
          challenge: { teamId },
        },
        status: 'COMPLETED',
        date: {
          gte: normalizedPeriodStart,
          lt: normalizedPeriodEnd,
        },
      },
      select: {
        date: true,
        status: true,
      },
    });

    // Group logs by period based on scope
    const groupedData: Map<string, number> = new Map();

    if (scope === 'week') {
      // Group by day - initialize all days in week first
      for (let i = 0; i < 7; i++) {
        const day = new Date(periodStart);
        day.setDate(periodStart.getDate() + i);
        const dayKey = day.toISOString().split('T')[0];
        groupedData.set(dayKey, 0);
      }

      // Then process all logs (already filtered by query)
      logs.forEach((log) => {
        const dayKey = log.date.toISOString().split('T')[0];
        const current = groupedData.get(dayKey) || 0;
        // Each COMPLETED log = 1 point
        groupedData.set(dayKey, current + 1);
      });
    } else if (scope === 'month') {
      // Group by week - use original month start (not adjusted for team creation) for week calculation
      const lastDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
      const weeksInMonth = Math.ceil((lastDay.getDate() + originalPeriodStart.getDay() - 1) / 7);

      for (let week = 0; week < weeksInMonth; week++) {
        const weekKey = `week-${week}`;
        groupedData.set(weekKey, 0);
      }

      logs.forEach((log) => {
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        
        // Calculate which week this log belongs to using original month start
        const daysDiff = Math.floor(
          (logDate.getTime() - originalPeriodStart.getTime()) / (1000 * 60 * 60 * 24),
        );
        const week = Math.floor(daysDiff / 7);
        
        // Ensure week is within valid range (logs are already filtered by query)
        if (week >= 0 && week < weeksInMonth) {
          const weekKey = `week-${week}`;
          const current = groupedData.get(weekKey) || 0;
          // Each COMPLETED log = 1 point
          groupedData.set(weekKey, current + 1);
        }
      });
    } else {
      // Group by month
      for (let month = 0; month < 12; month++) {
        const monthKey = `month-${month}`;
        groupedData.set(monthKey, 0);
      }

      logs.forEach((log) => {
        const logDate = new Date(log.date);
        // Get month (logs are already filtered by query to be within the year)
        const month = logDate.getMonth();
        const monthKey = `month-${month}`;
        const current = groupedData.get(monthKey) || 0;
        // Each COMPLETED log = 1 point
        groupedData.set(monthKey, current + 1);
      });
    }

    // Convert to array format
    const result: Array<{ date: string; count: number }> = [];

    if (scope === 'week') {
      for (let i = 0; i < 7; i++) {
        const day = new Date(periodStart);
        day.setDate(periodStart.getDate() + i);
        const dayKey = day.toISOString().split('T')[0];
        result.push({
          date: dayKey,
          count: Math.round((groupedData.get(dayKey) || 0) * 100) / 100, // Round to 2 decimal places for accuracy
        });
      }
    } else if (scope === 'month') {
      const weeksInMonth = Math.ceil(
        (new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate() +
          periodStart.getDay() -
          1) /
          7,
      );
      for (let week = 0; week < weeksInMonth; week++) {
        result.push({
          date: `week-${week}`,
          count: Math.round((groupedData.get(`week-${week}`) || 0) * 100) / 100, // Round to 2 decimal places for accuracy
        });
      }
    } else {
      for (let month = 0; month < 12; month++) {
        result.push({
          date: `month-${month}`,
          count: Math.round((groupedData.get(`month-${month}`) || 0) * 100) / 100, // Round to 2 decimal places for accuracy
        });
      }
    }

    return result;
  }
}
