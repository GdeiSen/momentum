import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { HabitsModule } from './modules/habits/habits.module';
import { HabitLogsModule } from './modules/habit-logs/habit-logs.module';
import { PostsModule } from './modules/posts/posts.module';
import { ChatsModule } from './modules/chats/chats.module';
import { StorageModule } from './modules/storage/storage.module';
import { UserSettingsModule } from './modules/user-settings/user-settings.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ChallengesModule,
    HabitsModule,
    HabitLogsModule,
    PostsModule,
    ChatsModule,
    StorageModule,
    UserSettingsModule,
    AiChatModule,
    WorkoutsModule,
  ],
})
export class AppModule {}
