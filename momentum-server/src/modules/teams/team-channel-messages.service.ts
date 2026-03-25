import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamPermissionsService } from './team-permissions.service';
import { CreateTeamChannelMessageDto } from './dto/create-team-channel-message.dto';

@Injectable()
export class TeamChannelMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamPermissionsService: TeamPermissionsService,
  ) {}

  private async getChannelOrThrow(teamId: string, channelId: string) {
    const channel = await this.prisma.teamChannel.findFirst({
      where: {
        id: channelId,
        teamId,
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async list(
    teamId: string,
    channelId: string,
    userId: string,
    limit = 50,
  ) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);
    await this.getChannelOrThrow(teamId, channelId);

    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const messages = await this.prisma.teamChannelMessage.findMany({
      where: {
        channelId,
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
        createdAt: 'desc',
      },
      take: safeLimit,
    });

    return messages.reverse();
  }

  async create(
    teamId: string,
    channelId: string,
    userId: string,
    dto: CreateTeamChannelMessageDto,
  ) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    const channel = await this.getChannelOrThrow(teamId, channelId);
    if (channel.isArchived) {
      throw new ForbiddenException('Cannot send messages to archived channels');
    }

    return this.prisma.teamChannelMessage.create({
      data: {
        channelId,
        userId,
        content: dto.content.trim(),
        mediaUrl: dto.mediaUrl?.trim(),
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
    });
  }

  async delete(
    teamId: string,
    channelId: string,
    messageId: string,
    userId: string,
  ) {
    await this.teamPermissionsService.getTeamMember(teamId, userId);

    const message = await this.prisma.teamChannelMessage.findFirst({
      where: {
        id: messageId,
        channelId,
        channel: {
          teamId,
        },
      },
      include: {
        channel: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isAuthor = message.userId === userId;
    const canModerate = await this.teamPermissionsService.hasPermission(
      teamId,
      userId,
      'messages.moderate',
    );

    if (!isAuthor && !canModerate) {
      throw new ForbiddenException(
        'Only message author or users with messages.moderate can delete this message',
      );
    }

    await this.prisma.teamChannelMessage.delete({
      where: { id: messageId },
    });

    return { message: 'Channel message deleted successfully' };
  }
}

