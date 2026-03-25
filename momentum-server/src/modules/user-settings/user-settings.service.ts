import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserSettingsPayload {
  theme: 'light' | 'dark' | 'system';
  language: string;
  widgets: {
    id: string;
    location: 'placeholder' | 'workspace' | 'dock';
    placeholderSlot?: number;
    x: number;
    y: number;
  }[];
  background: {
    type: 'color' | 'image';
    value: string;
    shape?: 'torus' | 'cube' | 'pyramid' | 'sphere';
    imageUrl?: string;
  };
  ui?: {
    teamChallenges?: {
      teamId: string;
      recentChallengeIds: string[];
    }[];
  };
}

@Injectable()
export class UserSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSettings(userId: string): Promise<UserSettingsPayload> {
    const existing = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (existing && existing.settings) {
      return existing.settings as unknown as UserSettingsPayload;
    }

    const defaultSettings: UserSettingsPayload = {
      theme: 'system',
      language: 'en',
      widgets: [],
      background: {
        type: 'color',
        value: 'dynamic',
        shape: 'torus',
        imageUrl: '/background.jpeg',
      },
      ui: {
        teamChallenges: [],
      },
    };

    await this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        settings: defaultSettings as unknown as Prisma.InputJsonValue,
      },
    });

    return defaultSettings;
  }

  async updateUserSettings(userId: string, payload: UserSettingsPayload): Promise<UserSettingsPayload> {
    await this.prisma.userSettings.upsert({
      where: { userId },
      update: {
        settings: payload as unknown as Prisma.InputJsonValue,
      },
      create: {
        userId,
        settings: payload as unknown as Prisma.InputJsonValue,
      },
    });

    return payload;
  }
}


