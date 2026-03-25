import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { UpsertWorkoutLogDto } from './dto/upsert-workout-log.dto';

@ApiTags('Workouts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('teams/:teamId/workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: 'Get workouts in team' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Team workouts list' })
  async list(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.workoutsService.list(teamId, user.id, includeArchived === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Create workout (requires workouts.manage)' })
  @ApiResponse({ status: 201, description: 'Workout created successfully' })
  async create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createWorkoutDto: CreateWorkoutDto,
  ) {
    return this.workoutsService.create(teamId, user.id, createWorkoutDto);
  }

  @Get('logs/me')
  @ApiOperation({ summary: 'Get current user workout logs in team' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Current user workout logs' })
  async getMyLogs(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.workoutsService.getMyLogs(teamId, user.id, from, to, parsedLimit);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get team workout logs feed' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Team workout logs feed' })
  async getTeamLogs(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.workoutsService.getTeamLogs(teamId, user.id, from, to, parsedLimit);
  }

  @Get(':workoutId')
  @ApiOperation({ summary: 'Get workout by ID' })
  @ApiResponse({ status: 200, description: 'Workout details' })
  async getById(
    @Param('teamId') teamId: string,
    @Param('workoutId') workoutId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.getById(teamId, workoutId, user.id);
  }

  @Patch(':workoutId')
  @ApiOperation({ summary: 'Update workout (requires workouts.manage)' })
  @ApiResponse({ status: 200, description: 'Workout updated successfully' })
  async update(
    @Param('teamId') teamId: string,
    @Param('workoutId') workoutId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateWorkoutDto: UpdateWorkoutDto,
  ) {
    return this.workoutsService.update(teamId, workoutId, user.id, updateWorkoutDto);
  }

  @Delete(':workoutId')
  @ApiOperation({ summary: 'Delete workout (requires workouts.manage)' })
  @ApiResponse({ status: 200, description: 'Workout deleted successfully' })
  async delete(
    @Param('teamId') teamId: string,
    @Param('workoutId') workoutId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.delete(teamId, workoutId, user.id);
  }

  @Get(':workoutId/logs')
  @ApiOperation({ summary: 'Get workout logs by workout' })
  @ApiResponse({ status: 200, description: 'Workout logs list' })
  async listLogs(
    @Param('teamId') teamId: string,
    @Param('workoutId') workoutId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.listLogs(teamId, workoutId, user.id);
  }

  @Post(':workoutId/logs/me')
  @ApiOperation({ summary: 'Create or update current user workout log (requires workouts.log)' })
  @ApiResponse({ status: 201, description: 'Workout log upserted successfully' })
  async upsertMyLog(
    @Param('teamId') teamId: string,
    @Param('workoutId') workoutId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() upsertWorkoutLogDto: UpsertWorkoutLogDto,
  ) {
    return this.workoutsService.upsertMyLog(teamId, workoutId, user.id, upsertWorkoutLogDto);
  }

  @Delete(':workoutId/logs/:logId')
  @ApiOperation({ summary: 'Delete workout log (owner or workouts.manage)' })
  @ApiResponse({ status: 200, description: 'Workout log deleted successfully' })
  async deleteLog(
    @Param('teamId') teamId: string,
    @Param('workoutId') workoutId: string,
    @Param('logId') logId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workoutsService.deleteLog(teamId, workoutId, logId, user.id);
  }
}
