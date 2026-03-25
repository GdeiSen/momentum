import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMembersService } from './team-members.service';

/**
 * Service for managing team email whitelist.
 */
@Injectable()
export class TeamWhitelistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  /**
   * Gets all whitelisted emails for a team.
   *
   * @param teamId - The team ID.
   * @param userId - The requesting user (must be admin/owner).
   * @returns List of whitelisted emails.
   */
  async getWhitelistEmails(teamId: string, userId: string) {
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can view the whitelist');
    }

    return this.prisma.teamWhitelistEmail.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Adds an email to the team's whitelist.
   *
   * @param teamId - The team ID.
   * @param email - The email to add.
   * @param userId - The requesting user (must be admin/owner).
   * @returns The created whitelist entry.
   */
  async addWhitelistEmail(teamId: string, email: string, userId: string) {
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can manage the whitelist');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await this.prisma.teamWhitelistEmail.findUnique({
      where: {
        teamId_email: { teamId, email: normalizedEmail },
      },
    });

    if (existing) {
      throw new ConflictException('Email is already in the whitelist');
    }

    return this.prisma.teamWhitelistEmail.create({
      data: {
        teamId,
        email: normalizedEmail,
      },
    });
  }

  /**
   * Adds multiple emails to the team's whitelist.
   *
   * @param teamId - The team ID.
   * @param emails - List of emails to add.
   * @param userId - The requesting user (must be admin/owner).
   * @returns Summary of added/skipped emails.
   */
  async addBulkWhitelistEmails(teamId: string, emails: string[], userId: string) {
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can manage the whitelist');
    }

    const normalizedEmails = [...new Set(emails.map((e) => e.toLowerCase().trim()))];

    // Get existing emails
    const existingEmails = await this.prisma.teamWhitelistEmail.findMany({
      where: {
        teamId,
        email: { in: normalizedEmails },
      },
      select: { email: true },
    });

    const existingSet = new Set(existingEmails.map((entry) => entry.email));
    const newEmails = normalizedEmails.filter((e) => !existingSet.has(e));

    if (newEmails.length > 0) {
      await this.prisma.teamWhitelistEmail.createMany({
        data: newEmails.map((email) => ({ teamId, email })),
        skipDuplicates: true,
      });
    }

    return {
      added: newEmails.length,
      skipped: existingEmails.length,
      total: normalizedEmails.length,
    };
  }

  /**
   * Removes an email from the team's whitelist.
   *
   * @param teamId - The team ID.
   * @param whitelistId - The whitelist entry ID.
   * @param userId - The requesting user (must be admin/owner).
   */
  async removeWhitelistEmail(teamId: string, whitelistId: string, userId: string) {
    const isAdminOrOwner = await this.teamMembersService.isAdminOrOwner(teamId, userId);
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Only admins and owners can manage the whitelist');
    }

    const entry = await this.prisma.teamWhitelistEmail.findUnique({
      where: { id: whitelistId },
    });

    if (!entry || entry.teamId !== teamId) {
      throw new NotFoundException('Whitelist entry not found');
    }

    await this.prisma.teamWhitelistEmail.delete({
      where: { id: whitelistId },
    });

    return { message: 'Email removed from whitelist' };
  }

  /**
   * Checks if an email is in the team's whitelist.
   *
   * @param teamId - The team ID.
   * @param email - The email to check.
   * @returns True if email is whitelisted.
   */
  async isEmailWhitelisted(teamId: string, email: string): Promise<boolean> {
    const entry = await this.prisma.teamWhitelistEmail.findUnique({
      where: {
        teamId_email: { teamId, email: email.toLowerCase().trim() },
      },
    });

    return !!entry;
  }
}

