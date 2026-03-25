import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembersService } from '../teams/team-members.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

/**
 * Service for managing team posts.
 */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  /**
   * Creates a new post in a team.
   *
   * @param teamId - The team ID.
   * @param userId - The author's user ID (must be team member).
   * @param createPostDto - Post creation data.
   * @returns Created post.
   */
  async create(teamId: string, userId: string, createPostDto: CreatePostDto) {
    // Check if user is a team member
    const isMember = await this.teamMembersService.isMember(teamId, userId);
    if (!isMember) {
      throw new ForbiddenException('Only team members can create posts');
    }

    return this.prisma.post.create({
      data: {
        teamId,
        authorId: userId,
        title: createPostDto.title,
        content: createPostDto.content,
        mediaUrls: createPostDto.mediaUrls || [],
      },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Finds all posts for a team.
   *
   * @param teamId - The team ID.
   * @param userId - Optional user ID to check membership.
   * @returns List of posts.
   */
  async findAllByTeam(teamId: string, userId?: string) {
    // Check team privacy
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
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

    return this.prisma.post.findMany({
      where: {
        teamId,
      },
      include: {
        author: {
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
    });
  }

  /**
   * Finds a post by ID.
   *
   * @param postId - The post ID.
   * @param userId - Optional user ID to check membership.
   * @returns Post data.
   */
  async findById(postId: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // If userId provided, check membership
    if (userId) {
      const isMember = await this.teamMembersService.isMember(post.teamId, userId);
      if (!isMember) {
        throw new ForbiddenException('Only team members can view posts');
      }
    }

    return post;
  }

  /**
   * Updates a post.
   *
   * @param postId - The post ID.
   * @param userId - The user ID (must be post author or admin).
   * @param updatePostDto - Update data.
   * @returns Updated post.
   */
  async update(postId: string, userId: string, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user is author or admin
    const isAuthor = post.authorId === userId;
    const isAdmin = await this.teamMembersService.isAdminOrOwner(post.teamId, userId);

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Only post author or team admins can update posts');
    }

    // Convert empty arrays to null for mediaUrls to allow deletion
    const updateData: {
      title?: string;
      content?: string;
      mediaUrls?: Prisma.InputJsonValue;
    } = {
      title: updatePostDto.title,
      content: updatePostDto.content,
    };

    // Handle mediaUrls: convert empty array to JsonNull, undefined stays undefined
    if ('mediaUrls' in updatePostDto) {
      updateData.mediaUrls =
        updatePostDto.mediaUrls !== undefined && updatePostDto.mediaUrls.length === 0
          ? (Prisma.JsonNull as unknown as Prisma.InputJsonValue)
          : (updatePostDto.mediaUrls as Prisma.InputJsonValue);
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Deletes a post.
   *
   * @param postId - The post ID.
   * @param userId - The user ID (must be post author or admin).
   */
  async delete(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user is author or admin
    const isAuthor = post.authorId === userId;
    const isAdmin = await this.teamMembersService.isAdminOrOwner(post.teamId, userId);

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Only post author or team admins can delete posts');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return { message: 'Post deleted successfully' };
  }
}




