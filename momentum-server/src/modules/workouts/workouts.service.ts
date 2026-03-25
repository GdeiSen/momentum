import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamPermissionsService } from '../teams/team-permissions.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { UpsertWorkoutLogDto } from './dto/upsert-workout-log.dto';

@Injectable()
export class WorkoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamPermissionsService: TeamPermissionsService,
  ) {}

  private readonly workoutInclude = {
    creator: {
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
      },
    },
    _count: {
      select: {
        logs: true,
      },
    },
  } as const;

  private parseDateOrThrow(value: string, fieldName: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date in ${fieldName}`);
    }
    return parsed;
  }

  private async getWorkoutOrThrow(teamId: string, workoutId: string) {
    const workout = await this.prisma.workout.findFirst({
      where: {
        id: workoutId,
        teamId,
      },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return workout;
  }

  async list(teamId: string, userId: string, includeArchived = false) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    return this.prisma.workout.findMany({
      where: {
        teamId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: this.workoutInclude,
      orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getById(teamId: string, workoutId: string, userId: string) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    const workout = await this.prisma.workout.findFirst({
      where: {
        id: workoutId,
        teamId,
      },
      include: this.workoutInclude,
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return workout;
  }

  async create(teamId: string, userId: string, dto: CreateWorkoutDto) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'workouts.manage',
      'Only members with workouts.manage permission can create workouts',
    );

    return this.prisma.workout.create({
      data: {
        teamId,
        createdBy: userId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        type: dto.type ?? 'OTHER',
        scheduledDate: dto.scheduledDate
          ? this.parseDateOrThrow(dto.scheduledDate, 'scheduledDate')
          : null,
        durationMinutes: dto.durationMinutes,
        caloriesTarget: dto.caloriesTarget,
      },
      include: this.workoutInclude,
    });
  }

  async update(teamId: string, workoutId: string, userId: string, dto: UpdateWorkoutDto) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'workouts.manage',
      'Only members with workouts.manage permission can update workouts',
    );
    await this.getWorkoutOrThrow(teamId, workoutId);

    return this.prisma.workout.update({
      where: { id: workoutId },
      data: {
        title: dto.title?.trim(),
        description:
          dto.description !== undefined
            ? dto.description === null
              ? null
              : dto.description.trim()
            : undefined,
        type: dto.type,
        scheduledDate:
          dto.scheduledDate !== undefined
            ? dto.scheduledDate === null
              ? null
              : this.parseDateOrThrow(dto.scheduledDate, 'scheduledDate')
            : undefined,
        durationMinutes: dto.durationMinutes,
        caloriesTarget: dto.caloriesTarget,
        isArchived: dto.isArchived,
      },
      include: this.workoutInclude,
    });
  }

  async delete(teamId: string, workoutId: string, userId: string) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'workouts.manage',
      'Only members with workouts.manage permission can delete workouts',
    );
    await this.getWorkoutOrThrow(teamId, workoutId);

    await this.prisma.workout.delete({
      where: { id: workoutId },
    });

    return { message: 'Workout deleted successfully' };
  }

  async listLogs(teamId: string, workoutId: string, userId: string) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);
    await this.getWorkoutOrThrow(teamId, workoutId);

    return this.prisma.workoutLog.findMany({
      where: {
        workoutId,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async upsertMyLog(teamId: string, workoutId: string, userId: string, dto: UpsertWorkoutLogDto) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'workouts.log',
      'Only members with workouts.log permission can log workouts',
    );
    const workout = await this.getWorkoutOrThrow(teamId, workoutId);

    if (workout.isArchived) {
      throw new ForbiddenException('Cannot log archived workout');
    }

    return this.prisma.workoutLog.upsert({
      where: {
        workoutId_userId: {
          workoutId,
          userId,
        },
      },
      update: {
        status: dto.status,
        durationMinutes: dto.durationMinutes,
        caloriesBurned: dto.caloriesBurned,
        distanceMeters: dto.distanceMeters,
        notes: dto.notes?.trim(),
      },
      create: {
        workoutId,
        userId,
        status: dto.status,
        durationMinutes: dto.durationMinutes,
        caloriesBurned: dto.caloriesBurned,
        distanceMeters: dto.distanceMeters,
        notes: dto.notes?.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        workout: {
          select: {
            id: true,
            teamId: true,
            title: true,
            type: true,
          },
        },
      },
    });
  }

  async deleteLog(teamId: string, workoutId: string, logId: string, userId: string) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    const log = await this.prisma.workoutLog.findFirst({
      where: {
        id: logId,
        workoutId,
        workout: {
          teamId,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!log) {
      throw new NotFoundException('Workout log not found');
    }

    const isAuthor = log.userId === userId;
    const canManage = await this.teamPermissionsService.hasPermission(
      teamId,
      userId,
      'workouts.manage',
    );

    if (!isAuthor && !canManage) {
      throw new ForbiddenException(
        'Only workout log owner or members with workouts.manage can delete workout logs',
      );
    }

    await this.prisma.workoutLog.delete({
      where: { id: logId },
    });

    return { message: 'Workout log deleted successfully' };
  }

  async getMyLogs(
    teamId: string,
    userId: string,
    from?: string,
    to?: string,
    limit = 50,
  ) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const scheduledDateFilter: { gte?: Date; lte?: Date } = {};

    if (from) {
      scheduledDateFilter.gte = this.parseDateOrThrow(from, 'from');
    }
    if (to) {
      scheduledDateFilter.lte = this.parseDateOrThrow(to, 'to');
    }

    return this.prisma.workoutLog.findMany({
      where: {
        userId,
        workout: {
          teamId,
          ...(Object.keys(scheduledDateFilter).length > 0
            ? { scheduledDate: scheduledDateFilter }
            : {}),
        },
      },
      include: {
        workout: {
          select: {
            id: true,
            title: true,
            type: true,
            scheduledDate: true,
            isArchived: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: safeLimit,
    });
  }

  async getTeamLogs(
    teamId: string,
    userId: string,
    from?: string,
    to?: string,
    limit = 100,
  ) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const updatedAtFilter: { gte?: Date; lte?: Date } = {};

    if (from) {
      updatedAtFilter.gte = this.parseDateOrThrow(from, 'from');
    }
    if (to) {
      updatedAtFilter.lte = this.parseDateOrThrow(to, 'to');
    }

    return this.prisma.workoutLog.findMany({
      where: {
        workout: {
          teamId,
        },
        ...(Object.keys(updatedAtFilter).length > 0
          ? { updatedAt: updatedAtFilter }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        workout: {
          select: {
            id: true,
            teamId: true,
            title: true,
            type: true,
            scheduledDate: true,
            isArchived: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: safeLimit,
    });
  }
}
