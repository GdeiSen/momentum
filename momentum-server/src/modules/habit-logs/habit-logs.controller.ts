import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { HabitLogsService } from './habit-logs.service';
import { CreateHabitLogDto } from './dto/create-habit-log.dto';
import { BulkUpdateHabitLogsDto } from './dto/bulk-update-habit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Habit Logs')
@Controller('habit-logs')
// Removed global @UseGuards(JwtAuthGuard) to allow optional auth on specific endpoints
// We will apply JwtAuthGuard to specific endpoints that require it
@ApiBearerAuth('JWT-auth')
export class HabitLogsController {
  constructor(private readonly habitLogsService: HabitLogsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create or update a habit log' })
  @ApiResponse({ status: 201, description: 'Habit log created/updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async createOrUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createHabitLogDto: CreateHabitLogDto,
  ) {
    return this.habitLogsService.createOrUpdate(user.id, createHabitLogDto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bulk update habit logs' })
  @ApiResponse({ status: 200, description: 'Bulk update results' })
  async bulkUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() bulkUpdateDto: BulkUpdateHabitLogsDto,
  ) {
    return this.habitLogsService.bulkUpdate(user.id, bulkUpdateDto);
  }

  @Delete(':logId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a habit log (reset to empty)' })
  @ApiResponse({ status: 200, description: 'Habit log deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async delete(@Param('logId') logId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.habitLogsService.delete(logId, user.id);
  }

  @Get('habit/:habitId/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get logs for a specific habit and user' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'List of habit logs' })
  async findByHabitAndUser(
    @Param('habitId') habitId: string,
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.habitLogsService.findByHabitAndUser(habitId, userId, startDate, endDate);
  }

  @Get('challenge/:challengeId/table')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all logs for challenge table view' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by specific user' })
  @ApiResponse({ status: 200, description: 'Challenge table data with logs' })
  async getChallengeTable(
    @Param('challengeId') challengeId: string,
    @Query('userId') userId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.habitLogsService.findByChallengeForTable(challengeId, userId, user?.id);
  }

  @Get('today')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get today's habits for current user" })
  @ApiResponse({ status: 200, description: "Today's habits with status" })
  async getTodayHabits(@CurrentUser() user: AuthenticatedUser) {
    return this.habitLogsService.getTodayHabits(user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user habit history' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back' })
  @ApiResponse({ status: 200, description: 'User habit history' })
  async getUserHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: number,
  ) {
    return this.habitLogsService.getUserHistory(user.id, days);
  }
}

