import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamMembersService } from './team-members.service';
import { TeamInvitesService } from './team-invites.service';
import { TeamWhitelistService } from './team-whitelist.service';

@Module({
  controllers: [TeamsController],
  providers: [
    TeamsService,
    TeamMembersService,
    TeamInvitesService,
    TeamWhitelistService,
  ],
  exports: [
    TeamsService,
    TeamMembersService,
    TeamInvitesService,
    TeamWhitelistService,
  ],
})
export class TeamsModule {}

