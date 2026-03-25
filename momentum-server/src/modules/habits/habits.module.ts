import { Module } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { HabitsController } from './habits.controller';
import { TeamsModule } from '../teams/teams.module';
import { ChallengesModule } from '../challenges/challenges.module';

@Module({
  imports: [TeamsModule, ChallengesModule],
  controllers: [HabitsController],
  providers: [HabitsService],
  exports: [HabitsService],
})
export class HabitsModule {}

