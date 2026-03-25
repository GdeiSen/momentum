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
import { TeamRole } from '@prisma/client';
import { TeamsService } from './teams.service';
import { TeamMembersService } from './team-members.service';
import { TeamInvitesService } from './team-invites.service';
import { TeamWhitelistService } from './team-whitelist.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { CreateTeamInviteDto, JoinWithInviteCodeDto } from './dto/team-invite.dto';
import { AddWhitelistEmailDto, AddBulkWhitelistEmailsDto } from './dto/team-whitelist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly teamMembersService: TeamMembersService,
    private readonly teamInvitesService: TeamInvitesService,
    private readonly teamWhitelistService: TeamWhitelistService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(user.id, createTeamDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all public teams' })
  @ApiResponse({ status: 200, description: 'List of teams' })
  async findAll() {
    return this.teamsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get teams the current user is a member of' })
  @ApiResponse({ status: 200, description: 'List of user teams' })
  async findMyTeams(@CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.findUserTeams(user.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':teamId')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiResponse({ status: 200, description: 'Team data' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiResponse({ status: 403, description: 'Team is private' })
  async findById(@Param('teamId') teamId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.teamsService.findById(teamId, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':teamId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update team settings' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update team' })
  async update(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.update(teamId, user.id, updateTeamDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':teamId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a team (owner only)' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can delete team' })
  async delete(@Param('teamId') teamId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.delete(teamId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/join')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Join a public team' })
  @ApiResponse({ status: 200, description: 'Successfully joined the team' })
  @ApiResponse({ status: 403, description: 'Cannot join private team or requires invite code' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  async join(@Param('teamId') teamId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.join(teamId, user.id, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/leave')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Leave a team' })
  @ApiResponse({ status: 200, description: 'Successfully left the team' })
  @ApiResponse({ status: 403, description: 'Owner cannot leave' })
  async leave(@Param('teamId') teamId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.leave(teamId, user.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':teamId/statistics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get team statistics' })
  @ApiResponse({ status: 200, description: 'Team statistics' })
  async getStatistics(@Param('teamId') teamId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.teamsService.getStatistics(teamId, user?.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':teamId/activity')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get team activity data by period' })
  @ApiResponse({ status: 200, description: 'Team activity data' })
  @ApiQuery({ name: 'scope', enum: ['week', 'month', 'year'], required: true })
  @ApiQuery({ name: 'referenceDate', type: String, required: true })
  async getActivityData(
    @Param('teamId') teamId: string,
    @Query('scope') scope: 'week' | 'month' | 'year',
    @Query('referenceDate') referenceDate: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.teamsService.getActivityData(teamId, scope, new Date(referenceDate), user?.id);
  }

  // Member management endpoints

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':teamId/members')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all team members' })
  @ApiResponse({ status: 200, description: 'List of team members' })
  async getMembers(@Param('teamId') teamId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.teamMembersService.getMembers(teamId, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':teamId/members/:userId/role')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update member role (owner only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.teamMembersService.updateRole(
      teamId,
      targetUserId,
      updateMemberRoleDto.role,
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':teamId/members/:userId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove a member from team' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamMembersService.removeMember(teamId, targetUserId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/transfer-ownership')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Transfer team ownership' })
  @ApiResponse({ status: 200, description: 'Ownership transferred successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can transfer ownership' })
  async transferOwnership(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() transferOwnershipDto: TransferOwnershipDto,
  ) {
    return this.teamMembersService.transferOwnership(
      teamId,
      transferOwnershipDto.newOwnerId,
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':teamId/members/:userId/statistics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get member statistics within team' })
  @ApiResponse({ status: 200, description: 'Member statistics' })
  async getMemberStatistics(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamMembersService.getMemberStatistics(teamId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/members/:userId/block')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Block a member from accessing the team (owner only)' })
  @ApiResponse({ status: 200, description: 'Member blocked successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async blockMember(
    @Param('teamId') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamMembersService.blockMember(teamId, targetUserId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/members/:userId/unblock')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unblock a member, restoring their access (owner only)' })
  @ApiResponse({ status: 200, description: 'Member unblocked successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async unblockMember(
    @Param('teamId') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamMembersService.unblockMember(teamId, targetUserId, user.id);
  }

  // ============================================
  // Invite Code Endpoints
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/invites')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new invite code' })
  @ApiResponse({ status: 201, description: 'Invite code created' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async createInvite(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createInviteDto: CreateTeamInviteDto,
  ) {
    return this.teamInvitesService.createInvite(teamId, user.id, createInviteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':teamId/invites')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all invite codes for a team' })
  @ApiResponse({ status: 200, description: 'List of invite codes' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async getTeamInvites(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamInvitesService.getTeamInvites(teamId, user.id);
  }

  @Public()
  @Get('invite/:code/validate')
  @ApiOperation({ summary: 'Validate an invite code and get team info' })
  @ApiResponse({ status: 200, description: 'Team info' })
  @ApiResponse({ status: 404, description: 'Invalid code' })
  async validateInviteCode(@Param('code') code: string) {
    return this.teamInvitesService.validateInviteCode(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite/:code/join')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Join a team using an invite code' })
  @ApiResponse({ status: 200, description: 'Successfully joined' })
  @ApiResponse({ status: 404, description: 'Invalid code' })
  @ApiResponse({ status: 403, description: 'Email not whitelisted' })
  async joinWithInviteCode(
    @Param('code') code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamInvitesService.joinWithInviteCode(code, user.id, user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':teamId/invites/:inviteId/deactivate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate an invite code' })
  @ApiResponse({ status: 200, description: 'Invite deactivated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async deactivateInvite(
    @Param('teamId') teamId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamInvitesService.deactivateInvite(teamId, inviteId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':teamId/invites/:inviteId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an invite code' })
  @ApiResponse({ status: 200, description: 'Invite deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async deleteInvite(
    @Param('teamId') teamId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamInvitesService.deleteInvite(teamId, inviteId, user.id);
  }

  // ============================================
  // Whitelist Endpoints
  // ============================================

  @UseGuards(JwtAuthGuard)
  @Get(':teamId/whitelist')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all whitelisted emails' })
  @ApiResponse({ status: 200, description: 'List of whitelisted emails' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async getWhitelistEmails(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamWhitelistService.getWhitelistEmails(teamId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/whitelist')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add an email to the whitelist' })
  @ApiResponse({ status: 201, description: 'Email added' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async addWhitelistEmail(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() addEmailDto: AddWhitelistEmailDto,
  ) {
    return this.teamWhitelistService.addWhitelistEmail(teamId, addEmailDto.email, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':teamId/whitelist/bulk')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add multiple emails to the whitelist' })
  @ApiResponse({ status: 201, description: 'Emails added' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async addBulkWhitelistEmails(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() addBulkEmailsDto: AddBulkWhitelistEmailsDto,
  ) {
    return this.teamWhitelistService.addBulkWhitelistEmails(
      teamId,
      addBulkEmailsDto.emails,
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':teamId/whitelist/:whitelistId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove an email from the whitelist' })
  @ApiResponse({ status: 200, description: 'Email removed' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async removeWhitelistEmail(
    @Param('teamId') teamId: string,
    @Param('whitelistId') whitelistId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamWhitelistService.removeWhitelistEmail(teamId, whitelistId, user.id);
  }
}

