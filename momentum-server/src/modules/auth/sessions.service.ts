import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PRISMA_RECORD_NOT_FOUND_ERROR_CODE = 'P2025';

interface CreateSessionData {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

/**
 * Service for managing user authentication sessions.
 */
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new session.
   *
   * @param data - Session data.
   * @returns Created session.
   */
  async create(data: CreateSessionData) {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Finds a session by ID.
   *
   * @param sessionId - The session ID.
   * @returns Session or null.
   */
  async findById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
    });
  }

  /**
   * Finds a session by ID and refresh token.
   *
   * @param sessionId - The session ID.
   * @param refreshToken - The refresh token.
   * @returns Session or null.
   */
  async findByIdAndToken(sessionId: string, refreshToken: string) {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        refreshToken,
      },
    });
  }

  /**
   * Finds all sessions for a user.
   *
   * @param userId - The user ID.
   * @returns List of sessions.
   */
  async findAllByUserId(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Updates the refresh token for a session.
   *
   * @param sessionId - The session ID.
   * @param refreshToken - The new refresh token.
   */
  async updateRefreshToken(sessionId: string, refreshToken: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { refreshToken },
    });
  }

  /**
   * Deletes a session by ID.
   * Silently handles the case when the session does not exist.
   *
   * @param sessionId - The session ID.
   * @returns Deleted session or null if not found.
   */
  async delete(sessionId: string) {
    try {
      return await this.prisma.session.delete({
        where: { id: sessionId },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_RECORD_NOT_FOUND_ERROR_CODE
      ) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Deletes a session by session ID (alias for delete).
   *
   * @param sessionId - The session ID.
   */
  async deleteBySessionId(sessionId: string) {
    return this.delete(sessionId);
  }

  /**
   * Deletes all sessions for a user.
   *
   * @param userId - The user ID.
   */
  async deleteAllByUserId(userId: string) {
    return this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Deletes expired sessions (cleanup job).
   */
  async deleteExpired() {
    return this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

