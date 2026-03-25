import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamPermissionsService } from './team-permissions.service';
import { CreateTeamChannelDto } from './dto/create-team-channel.dto';
import { UpdateTeamChannelDto } from './dto/update-team-channel.dto';

@Injectable()
export class TeamChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamPermissionsService: TeamPermissionsService,
  ) {}

  private slugify(name: string): string {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return base || 'channel';
  }

  private async getUniqueSlug(teamId: string, name: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.teamChannel.findUnique({
        where: {
          teamId_slug: { teamId, slug: candidate },
        },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  async list(teamId: string, userId: string) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    return this.prisma.teamChannel.findMany({
      where: { teamId },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getById(teamId: string, channelId: string, userId: string) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    const channel = await this.prisma.teamChannel.findFirst({
      where: {
        id: channelId,
        teamId,
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async create(teamId: string, userId: string, dto: CreateTeamChannelDto) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'channels.create',
      'Only members with channels.create permission can create channels',
    );

    const slug = await this.getUniqueSlug(teamId, dto.name);

    try {
      return await this.prisma.teamChannel.create({
        data: {
          teamId,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim(),
          isDefault: false,
          createdBy: userId,
        },
      });
    } catch {
      throw new ConflictException('Channel with similar slug already exists');
    }
  }

  async update(
    teamId: string,
    channelId: string,
    userId: string,
    dto: UpdateTeamChannelDto,
  ) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'channels.manage',
      'Only members with channels.manage permission can update channels',
    );

    const existing = await this.prisma.teamChannel.findFirst({
      where: {
        id: channelId,
        teamId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Channel not found');
    }

    const updatedName = dto.name?.trim();
    let nextSlug: string | undefined;
    if (updatedName && updatedName !== existing.name) {
      nextSlug = await this.getUniqueSlug(teamId, updatedName);
    }

    return this.prisma.teamChannel.update({
      where: { id: channelId },
      data: {
        name: updatedName,
        description:
          dto.description !== undefined ? dto.description.trim() : undefined,
        isArchived: dto.isArchived,
        slug: nextSlug,
      },
    });
  }

  async delete(teamId: string, channelId: string, userId: string) {
    await this.teamPermissionsService.requirePermission(
      teamId,
      userId,
      'channels.manage',
      'Only members with channels.manage permission can delete channels',
    );

    const channel = await this.prisma.teamChannel.findFirst({
      where: {
        id: channelId,
        teamId,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.isDefault) {
      throw new ForbiddenException('Default channels cannot be deleted');
    }

    await this.prisma.teamChannel.delete({
      where: { id: channelId },
    });

    return { message: 'Channel deleted successfully' };
  }

  async ensureDefaultChannels(teamId: string, ownerId: string) {
    await this.prisma.teamChannel.upsert({
      where: {
        teamId_slug: { teamId, slug: 'general' },
      },
      update: {
        isDefault: true,
        isArchived: false,
      },
      create: {
        teamId,
        name: 'General',
        slug: 'general',
        description: 'Main team conversation channel',
        isDefault: true,
        isArchived: false,
        createdBy: ownerId,
      },
    });

    await this.prisma.teamChannel.upsert({
      where: {
        teamId_slug: { teamId, slug: 'announcements' },
      },
      update: {
        isDefault: true,
        isArchived: false,
      },
      create: {
        teamId,
        name: 'Announcements',
        slug: 'announcements',
        description: 'Important updates and official announcements',
        isDefault: true,
        isArchived: false,
        createdBy: ownerId,
      },
    });
  }
}

