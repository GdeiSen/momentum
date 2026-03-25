import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Challenges')
@Controller('teams/:teamId/challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new challenge' })
  @ApiResponse({ status: 201, description: 'Challenge created successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to create challenges' })
  async create(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createChallengeDto: CreateChallengeDto,
  ) {
    return this.challengesService.create(teamId, user.id, createChallengeDto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all challenges for a team' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'upcoming', 'past'],
    description: 'Filter by challenge status',
  })
  @ApiResponse({ status: 200, description: 'List of challenges' })
  async findAll(
    @Param('teamId') teamId: string,
    @Query('status') status?: 'active' | 'upcoming' | 'past',
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.challengesService.findAllByTeam(teamId, status, user?.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':challengeId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get challenge by ID' })
  @ApiResponse({ status: 200, description: 'Challenge data' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  async findById(@Param('challengeId') challengeId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.challengesService.findById(challengeId, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':challengeId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a challenge' })
  @ApiResponse({ status: 200, description: 'Challenge updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update challenges' })
  async update(
    @Param('challengeId') challengeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateChallengeDto: UpdateChallengeDto,
  ) {
    return this.challengesService.update(challengeId, user.id, updateChallengeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':challengeId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a challenge' })
  @ApiResponse({ status: 200, description: 'Challenge deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete challenges' })
  async delete(
    @Param('challengeId') challengeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.challengesService.delete(challengeId, user.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':challengeId/statistics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get challenge statistics' })
  @ApiResponse({ status: 200, description: 'Challenge statistics' })
  async getStatistics(@Param('challengeId') challengeId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.challengesService.getStatistics(challengeId, user?.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':challengeId/leaderboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get challenge leaderboard' })
  @ApiResponse({ status: 200, description: 'Challenge leaderboard' })
  async getLeaderboard(@Param('challengeId') challengeId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.challengesService.getLeaderboard(challengeId, user?.id);
  }
}

