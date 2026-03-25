import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types';

@ApiTags('AI Chat')
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send a message to AI assistant' })
  @ApiResponse({ status: 200, description: 'AI response' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() chatMessageDto: ChatMessageDto,
  ) {
    return this.aiChatService.chat(user.id, chatMessageDto);
  }
}

