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
import { ChatsService } from './chats.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('Chats')
@Controller('teams/:teamId/chat')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get chat for a team' })
  @ApiResponse({ status: 200, description: 'Chat data' })
  @ApiResponse({ status: 403, description: 'Not authorized to view chat' })
  async getChat(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatsService.getChatByTeam(teamId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all messages for a team chat' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of messages to return' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Cursor for pagination' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  @ApiResponse({ status: 403, description: 'Not authorized to view messages' })
  async getMessages(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.chatsService.getMessages(teamId, user.id, limitNum, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new message in team chat' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to send messages' })
  async createMessage(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.chatsService.createMessage(teamId, user.id, createMessageDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('messages/:messageId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete message' })
  async deleteMessage(
    @Param('teamId') teamId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatsService.deleteMessage(messageId, user.id);
  }
}




