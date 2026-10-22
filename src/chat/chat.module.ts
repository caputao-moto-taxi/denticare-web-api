import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PatientsModule } from '../patients/patients.module';
import { ChatController } from './infra/http/controllers/chat.controller';
import { ChatGateway } from './infra/realtime/chat.gateway';
import { ChatRealtimeService } from './infra/realtime/chat-realtime.service';
import { CHAT_PROVIDERS } from './chat.providers';

@Module({
  imports: [AuthModule, PatientsModule],
  controllers: [ChatController],
  providers: [
    ChatRealtimeService,
    ChatGateway,
    ...Object.values(CHAT_PROVIDERS.REPOSITORIES),
    ...Object.values(CHAT_PROVIDERS.USE_CASES),
  ],
})
export class ChatModule {}
