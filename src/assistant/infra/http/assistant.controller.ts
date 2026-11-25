import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ChatAssistantUseCase } from '../../application/useCases/chat-assistant/chat-assistant-use-case';
import { AssistantChatDto } from './assistant-chat.dto';

@ApiTags('Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly chatAssistant: ChatAssistantUseCase) {}

  @Post('chat')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  chat(@Body() input: AssistantChatDto) {
    return this.chatAssistant.execute(input.messages);
  }
}
