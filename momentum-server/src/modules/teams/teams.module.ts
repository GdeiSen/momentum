import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamMembersService } from './team-members.service';
import { TeamInvitesService } from './team-invites.service';
import { TeamWhitelistService } from './team-whitelist.service';
import { TeamPermissionsService } from './team-permissions.service';
import { TeamRoleTemplatesService } from './team-role-templates.service';
import { TeamChannelsService } from './team-channels.service';
import { TeamChannelMessagesService } from './team-channel-messages.service';

@Module({
  controllers: [TeamsController],
  providers: [
    TeamsService,
    TeamMembersService,
    TeamInvitesService,
    TeamWhitelistService,
    TeamPermissionsService,
    TeamRoleTemplatesService,
    TeamChannelsService,
    TeamChannelMessagesService,
  ],
  exports: [
    TeamsService,
    TeamMembersService,
    TeamInvitesService,
    TeamWhitelistService,
    TeamPermissionsService,
    TeamRoleTemplatesService,
    TeamChannelsService,
    TeamChannelMessagesService,
  ],
})
export class TeamsModule {}
