import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';
import { UserSettingsPayload, UserSettingsService } from './user-settings.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WidgetSettingsDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ enum: ['placeholder', 'workspace', 'dock'] })
  @IsIn(['placeholder', 'workspace', 'dock'])
  location: 'placeholder' | 'workspace' | 'dock';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  placeholderSlot?: number;

  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;
}

class BackgroundSettingsDto {
  @ApiProperty({ enum: ['color', 'image'] })
  @IsIn(['color', 'image'])
  type: 'color' | 'image';

  @ApiProperty()
  @IsString()
  value: string;

  @ApiProperty({ enum: ['torus', 'cube', 'pyramid', 'sphere'], required: false })
  @IsOptional()
  @IsIn(['torus', 'cube', 'pyramid', 'sphere'])
  shape?: 'torus' | 'cube' | 'pyramid' | 'sphere';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

class TeamChallengesSettingsDto {
  @ApiProperty()
  @IsString()
  teamId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  recentChallengeIds: string[];
}

class UiSettingsDto {
  @ApiProperty({ type: [TeamChallengesSettingsDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TeamChallengesSettingsDto)
  teamChallenges?: TeamChallengesSettingsDto[];
}

export class UpdateUserSettingsDto {
  @ApiProperty({ enum: ['light', 'dark', 'system'] })
  @IsIn(['light', 'dark', 'system'])
  theme: 'light' | 'dark' | 'system';

  @ApiProperty()
  @IsString()
  language: string;

  @ApiProperty({ type: [WidgetSettingsDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetSettingsDto)
  widgets: WidgetSettingsDto[];

  @ApiProperty({ type: BackgroundSettingsDto })
  @ValidateNested()
  @Type(() => BackgroundSettingsDto)
  background: BackgroundSettingsDto;

  @ApiProperty({ type: UiSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UiSettingsDto)
  ui?: UiSettingsDto;
}

@ApiTags('User Settings')
@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiResponse({ status: 200, description: 'User settings JSON payload' })
  async getUserSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.userSettingsService.getUserSettings(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user settings' })
  @ApiResponse({ status: 200, description: 'User settings updated' })
  async updateUserSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    const payload: UserSettingsPayload = {
      theme: dto.theme,
      language: dto.language,
      widgets: dto.widgets,
      background: dto.background,
      ui: dto.ui,
    };
    return this.userSettingsService.updateUserSettings(user.id, payload);
  }
}


