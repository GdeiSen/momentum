import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembersService } from '../teams/team-members.service';
import { CreateMessageDto } from './dto/create-message.dto';

/**
 * Service for managing team chats and messages.
 */
@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  /**
   * Gets or creates a chat for a team.
   *
   * @param teamId - The team ID.
   * @returns Chat data.
   */
  async getOrCreateChat(teamId: string) {
    let chat = await this.prisma.chat.findUnique({
      where: { teamId },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: { teamId },
      });
    }

    return chat;
  }

  /**
   * Gets chat by team ID.
   *
   * @param teamId - The team ID.
   * @param userId - Optional user ID to check membership.
   * @returns Chat data.
   */
  async getChatByTeam(teamId: string, userId?: string) {
    // If userId provided, check membership
    if (userId) {
      const isMember = await this.teamMembersService.isMember(teamId, userId);
      if (!isMember) {
        throw new ForbiddenException('Only team members can view chat');
      }
    }

    const chat = await this.getOrCreateChat(teamId);

    return chat;
  }

  /**
   * Gets all messages for a team chat.
   *
   * @param teamId - The team ID.
   * @param userId - Optional user ID to check membership.
   * @param limit - Optional limit for pagination.
   * @param cursor - Optional cursor for pagination.
   * @returns List of messages.
   */
  async getMessages(
    teamId: string,
    userId?: string,
    limit: number = 50,
    cursor?: string,
  ) {
    // If userId provided, check membership
    if (userId) {
      const isMember = await this.teamMembersService.isMember(teamId, userId);
      if (!isMember) {
        throw new ForbiddenException('Only team members can view messages');
      }
    }

    const chat = await this.getOrCreateChat(teamId);

    const where: any = { chatId: chat.id };
    if (cursor) {
      where.id = { lt: cursor };
    }

    const messages = await this.prisma.message.findMany({
      where,
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
      take: limit,
    });

    // Reverse to show oldest first
    return messages.reverse();
  }

  /**
   * Creates a new message in a team chat.
   *
   * @param teamId - The team ID.
   * @param userId - The author's user ID (must be team member).
   * @param createMessageDto - Message creation data.
   * @returns Created message.
   */
  async createMessage(
    teamId: string,
    userId: string,
    createMessageDto: CreateMessageDto,
  ) {
    // Check if user is a team member
    const isMember = await this.teamMembersService.isMember(teamId, userId);
    if (!isMember) {
      throw new ForbiddenException('Only team members can send messages');
    }

    const chat = await this.getOrCreateChat(teamId);

    return this.prisma.message.create({
      data: {
        chatId: chat.id,
        userId,
        content: createMessageDto.content,
        mediaUrl: createMessageDto.mediaUrl,
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

  /**
   * Deletes a message.
   *
   * @param messageId - The message ID.
   * @param userId - The user ID (must be message author or admin).
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is author or admin
    const isAuthor = message.userId === userId;
    const isAdmin = await this.teamMembersService.isAdminOrOwner(
      message.chat.team.id,
      userId,
    );

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException(
        'Only message author or team admins can delete messages',
      );
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    return { message: 'Message deleted successfully' };
  }
}




