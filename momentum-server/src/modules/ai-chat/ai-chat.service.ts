import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';
import { ChallengesService } from '../challenges/challenges.service';
import { ChatMessageDto } from './dto/chat-message.dto';

interface UserContext {
  nickname: string;
  statistics: {
    teamsCount: number;
    completedHabitsCount: number;
    challengesCount: number;
    currentStreak: number;
    totalHabitsCount: number;
    recentActivityDays: number;
  };
  teams: Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
    description?: string;
    slogan?: string;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    description?: string;
    teamName: string;
    status: 'active' | 'upcoming' | 'completed';
    startDate: string;
    endDate: string;
    habitsCount: number;
    userProgress?: {
      completedHabits: number;
      totalHabits: number;
      completionRate: number;
    };
    habits?: Array<{
      id: string;
      title: string;
      description?: string;
      userCompletedCount: number;
    }>;
  }>;
}

@Injectable()
export class AiChatService {
  private apiKey: string;
  private apiURL: string;
  private model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly teamsService: TeamsService,
    private readonly challengesService: ChallengesService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.apiURL = this.configService.get<string>('OPENAI_API_URL') || '';
    this.model = this.configService.get<string>('OPENAI_MODEL', 'grok-4-fast');
    
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    if (!this.apiURL) {
      throw new Error('OPENAI_API_URL is not configured');
    }
    
    this.apiURL = this.apiURL.trim().replace(/\/+$/, '');
  }

  /**
   * Builds user context for AI assistant.
   */
  private async buildUserContext(userId: string): Promise<UserContext> {
    const user = await this.usersService.findById(userId);
    const baseStatistics = await this.usersService.getStatistics(userId);

    // Get user's teams with details
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    const teams = teamMembers.map((tm) => ({
      id: tm.team.id,
      name: tm.team.name,
      role: tm.role,
      memberCount: tm.team._count.members,
      description: tm.team.description || undefined,
      slogan: tm.team.slogan || undefined,
    }));

    // Get total habits count
    const totalHabitsCount = await this.prisma.habit.count({
      where: {
        challenge: {
          team: {
            members: {
              some: { userId },
            },
          },
        },
      },
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogs = await this.prisma.habitLog.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo },
        status: 'COMPLETED',
      },
      select: { date: true },
    });
    const recentActivityDays = new Set(
      recentLogs.map((log) => log.date.toISOString().split('T')[0])
    ).size;

    // Get user's challenges with detailed information
    const allChallenges: UserContext['challenges'] = [];
    for (const team of teams) {
      try {
        const challenges = await this.challengesService.findAllByTeam(team.id);
        const now = new Date();
        for (const challenge of challenges) {
          const startDate = new Date(challenge.startDate);
          const endDate = new Date(challenge.endDate);
          let status: 'active' | 'upcoming' | 'completed' = 'completed';
          if (now < startDate) {
            status = 'upcoming';
          } else if (now >= startDate && now <= endDate) {
            status = 'active';
          }

          // Get challenge details with habits
          const challengeDetails = await this.challengesService.findById(challenge.id);
          const habitsCount = challengeDetails._count.habits;

          // Get user's progress in this challenge
          const userHabitLogs = await this.prisma.habitLog.findMany({
            where: {
              userId,
              habit: {
                challengeId: challenge.id,
              },
              status: 'COMPLETED',
            },
            select: {
              habitId: true,
            },
          });
          const uniqueCompletedHabits = new Set(userHabitLogs.map((log) => log.habitId)).size;
          const completionRate = habitsCount > 0 ? (uniqueCompletedHabits / habitsCount) * 100 : 0;

          // Get habits with user progress
          const habits = challengeDetails.habits.map((habit) => {
            const userCompletedCount = userHabitLogs.filter(
              (log) => log.habitId === habit.id
            ).length;
            return {
              id: habit.id,
              title: habit.title,
              description: habit.description || undefined,
              userCompletedCount,
            };
          });

          allChallenges.push({
            id: challenge.id,
            title: challengeDetails.title,
            description: challengeDetails.description || undefined,
            teamName: team.name,
            status,
            startDate: challenge.startDate.toISOString(),
            endDate: challenge.endDate.toISOString(),
            habitsCount,
            userProgress: {
              completedHabits: uniqueCompletedHabits,
              totalHabits: habitsCount,
              completionRate: Math.round(completionRate * 10) / 10,
            },
            habits,
          });
        }
      } catch (error) {
        // Skip teams where user doesn't have access
        continue;
      }
    }

    return {
      nickname: user.nickname,
      statistics: {
        ...baseStatistics,
        totalHabitsCount,
        recentActivityDays,
      },
      teams,
      challenges: allChallenges,
    };
  }

  /**
   * Generates system prompt with user context.
   */
  private generateSystemPrompt(context: UserContext): string {
    const activeChallenges = context.challenges.filter((c) => c.status === 'active');
    const upcomingChallenges = context.challenges.filter((c) => c.status === 'upcoming');
    const completedChallenges = context.challenges.filter((c) => c.status === 'completed');

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const getStreakEmoji = (streak: number) => {
      if (streak >= 30) return '🔥🔥🔥';
      if (streak >= 14) return '🔥🔥';
      if (streak >= 7) return '🔥';
      if (streak >= 3) return '✨';
      return '💪';
    };

    const streakEmoji = getStreakEmoji(context.statistics.currentStreak);

    return `Ты - мотивационный ИИ помощник в приложении Momentum, которое помогает пользователям отслеживать привычки и участвовать в испытаниях (challenges) в командах.

ТВОЯ РОЛЬ: Ты энтузиаст, тренер и друг, который вдохновляет пользователя на достижение целей. Твои ответы должны быть:
- Максимально мотивационными и вдохновляющими
- Энергичными и позитивными
- Конкретными и полезными
- Поддерживающими и понимающими
- Использовать эмодзи для выражения эмоций (но умеренно)
- Подчеркивать достижения и прогресс
- Предлагать конкретные действия для улучшения

ПОЛЬЗОВАТЕЛЬ: ${context.nickname}

СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ:
🎯 Команд: ${context.statistics.teamsCount}
✅ Завершенных привычек: ${context.statistics.completedHabitsCount}
📊 Всего привычек в испытаниях: ${context.statistics.totalHabitsCount}
🏆 Участие в испытаниях: ${context.statistics.challengesCount}
${streakEmoji} Текущая серия дней: ${context.statistics.currentStreak} ${context.statistics.currentStreak > 0 ? 'дней подряд!' : '(начни сегодня!)'}
📅 Активность за последние 7 дней: ${context.statistics.recentActivityDays} ${context.statistics.recentActivityDays === 7 ? 'дней - отлично!' : context.statistics.recentActivityDays >= 5 ? 'дней - хороший результат!' : 'дней - можно улучшить!'}

АКТИВНЫЕ ИСПЫТАНИЯ (${activeChallenges.length}):
${activeChallenges.length > 0 ? activeChallenges.map((c) => {
  const progress = c.userProgress ? `\n   📈 Прогресс: ${c.userProgress.completedHabits}/${c.userProgress.totalHabits} привычек (${c.userProgress.completionRate}%)` : '';
  const habitsInfo = c.habits && c.habits.length > 0 
    ? `\n   📝 Привычки:\n${c.habits.map((h) => `      • ${h.title}${h.userCompletedCount > 0 ? ` (выполнено ${h.userCompletedCount} раз)` : ' (еще не начато)'}`).join('\n')}`
    : '';
  return `🎯 "${c.title}" в команде "${c.teamName}"\n   📅 До ${formatDate(c.endDate)}${c.description ? `\n   📖 ${c.description}` : ''}${progress}${habitsInfo}`;
}).join('\n\n') : '❌ Нет активных испытаний - время начать новое!'}

ПРЕДСТОЯЩИЕ ИСПЫТАНИЯ (${upcomingChallenges.length}):
${upcomingChallenges.length > 0 ? upcomingChallenges.map((c) => {
  return `⏰ "${c.title}" в команде "${c.teamName}"\n   📅 Начало: ${formatDate(c.startDate)}${c.description ? `\n   📖 ${c.description}` : ''}\n   📝 Привычек в испытании: ${c.habitsCount}`;
}).join('\n\n') : '📅 Нет предстоящих испытаний'}

ЗАВЕРШЕННЫЕ ИСПЫТАНИЯ (${completedChallenges.length}):
${completedChallenges.length > 0 ? completedChallenges.slice(0, 5).map((c) => {
  const progress = c.userProgress ? ` (${c.userProgress.completionRate}% выполнено)` : '';
  return `✅ "${c.title}" в команде "${c.teamName}"${progress}`;
}).join('\n') : '🎯 Пока нет завершенных испытаний - продолжай!'}
${completedChallenges.length > 5 ? `... и еще ${completedChallenges.length - 5} завершенных испытаний` : ''}

КОМАНДЫ ПОЛЬЗОВАТЕЛЯ:
${context.teams.map((t) => {
  const roleText = t.role === 'OWNER' ? '👑 Владелец' : t.role === 'ADMIN' ? '⭐ Администратор' : '👤 Участник';
  return `👥 "${t.name}"\n   ${roleText}\n   👥 Участников: ${t.memberCount}${t.slogan ? `\n   💬 Девиз: ${t.slogan}` : ''}${t.description ? `\n   📖 ${t.description}` : ''}`;
}).join('\n\n')}

ВАЖНЫЕ ПРИНЦИПЫ ОБЩЕНИЯ:
1. ВСЕГДА начинай с позитивного приветствия или признания достижений
2. Используй конкретные данные из статистики для мотивации
3. Если серия дней хорошая - подчеркни это и мотивируй продолжать
4. Если серия дней низкая - мягко мотивируй начать сегодня
5. Для активных испытаний - показывай прогресс и мотивируй продолжать
6. Используй эмодзи для выражения эмоций (🔥 для серий, 🎯 для целей, 💪 для мотивации)
7. Предлагай конкретные действия: "Сегодня выполни хотя бы одну привычку из испытания..."
8. Отмечай даже маленькие достижения
9. Будь искренним и энтузиастичным, но не навязчивым
10. Если пользователь спрашивает о чем-то конкретном - давай детальный ответ с использованием всех доступных данных

СТИЛЬ ОТВЕТОВ:
- Используй разговорный, дружелюбный тон
- Обращайся к пользователю по имени (${context.nickname})
- Используй восклицательные знаки для выражения энтузиазма (но умеренно)
- Структурируй ответы с помощью эмодзи и списков для читаемости
- Всегда заканчивай на позитивной ноте или призывом к действию

Отвечай ТОЛЬКО на русском языке. Будь максимально мотивационным, вдохновляющим и полезным!`;
  }

  /**
   * Sends a message to AI assistant and gets response.
   */
  async chat(userId: string, chatMessageDto: ChatMessageDto): Promise<{ response: string }> {
    try {
      const context = await this.buildUserContext(userId);
      const systemPrompt = this.generateSystemPrompt(context);

      // Build messages array
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: systemPrompt,
        },
      ];

      // Add conversation history if provided
      if (chatMessageDto.history && chatMessageDto.history.length > 0) {
        for (const msg of chatMessageDto.history) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }

      // Add current message
      messages.push({
        role: 'user',
        content: chatMessageDto.message,
      });

      // Формируем полный URL с /chat/completions
      // Timeweb ожидает: https://agent.timeweb.cloud/api/v1/cloud-ai/agents/{agent-id}/v1/chat/completions
      const chatCompletionsURL = `${this.apiURL}/chat/completions`;

      // Прямой HTTP запрос через undici fetch
      const requestBody = {
        model: this.model,
        messages,
        temperature: 0.8, // Немного выше для более креативных и мотивационных ответов
        max_tokens: 1000, // Увеличено для более развернутых мотивационных ответов
        stream: false,
      };

      const response = await fetch(chatCompletionsURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }
        
        if (response.status === 403) {
          throw new BadRequestException(
            `Access denied (403). ${errorData.message || 'Unauthorized access'}\n` +
            'Please verify:\n' +
            '1. Your API key (OPENAI_API_KEY) is correct and matches your agent token\n' +
            '2. The model "' + this.model + '" is available for your agent\n' +
            '3. Your agent has proper permissions\n' +
            '4. Check Timeweb Cloud AI dashboard for correct token format'
          );
        }
        
        if (response.status === 401) {
          throw new BadRequestException('Invalid API key. Please check your OPENAI_API_KEY configuration.');
        }
        
        if (response.status === 404) {
          throw new BadRequestException(
            'API endpoint not found (404). Please check:\n' +
            '1. Your OPENAI_API_URL is correct\n' +
            '2. URL format: https://agent.timeweb.cloud/api/v1/cloud-ai/agents/{agent-id}/v1'
          );
        }
        
        throw new BadRequestException(`API request failed with status ${response.status}: ${errorText}`);
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const aiResponse = data.choices?.[0]?.message?.content;
      if (!aiResponse) {
        throw new BadRequestException('Failed to get response from AI');
      }

      return { response: aiResponse };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        error?.message || 'Failed to process AI chat request. Please check your configuration.'
      );
    }
  }
}

