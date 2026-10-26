import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { AssistantController } from './infra/http/assistant.controller';
import { AssistantChatGateway } from './application/assistant-chat-gateway';
import { ChatAssistantUseCase } from './application/useCases/chat-assistant/chat-assistant-use-case';
import { LangChainAssistantChatGateway } from './infra/ai/langchain-assistant-chat.gateway';

@Module({
  imports: [AuthModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [AssistantController],
  providers: [
    ChatAssistantUseCase,
    {
      provide: AssistantChatGateway,
      useClass: LangChainAssistantChatGateway,
    },
  ],
})
export class AssistantModule {}
