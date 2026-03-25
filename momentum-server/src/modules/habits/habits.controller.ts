import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Habits')
@Controller('challenges/:challengeId/habits')
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new habit' })
  @ApiResponse({ status: 201, description: 'Habit created successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to create habits' })
  async create(
    @Param('challengeId') challengeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createHabitDto: CreateHabitDto,
  ) {
    return this.habitsService.create(challengeId, user.id, createHabitDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all habits for a challenge' })
  @ApiResponse({ status: 200, description: 'List of habits' })
  async findAll(@Param('challengeId') challengeId: string) {
    return this.habitsService.findAllByChallenge(challengeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':habitId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get habit by ID' })
  @ApiResponse({ status: 200, description: 'Habit data' })
  @ApiResponse({ status: 404, description: 'Habit not found' })
  async findById(@Param('habitId') habitId: string) {
    return this.habitsService.findById(habitId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':habitId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a habit' })
  @ApiResponse({ status: 200, description: 'Habit updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update habits' })
  async update(
    @Param('habitId') habitId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateHabitDto: UpdateHabitDto,
  ) {
    return this.habitsService.update(habitId, user.id, updateHabitDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':habitId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a habit' })
  @ApiResponse({ status: 200, description: 'Habit deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete habits' })
  async delete(
    @Param('habitId') habitId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.habitsService.delete(habitId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':habitId/statistics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get habit statistics' })
  @ApiResponse({ status: 200, description: 'Habit statistics' })
  async getStatistics(@Param('habitId') habitId: string) {
    return this.habitsService.getStatistics(habitId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':habitId/leaderboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get habit leaderboard' })
  @ApiResponse({ status: 200, description: 'Habit leaderboard' })
  async getLeaderboard(@Param('habitId') habitId: string) {
    return this.habitsService.getLeaderboard(habitId);
  }
}

