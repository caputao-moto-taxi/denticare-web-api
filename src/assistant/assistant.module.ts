import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { AssistantController } from './infra/http/assistant.controller';
import { AssistantService } from './application/assistant.service';

@Module({
  imports: [AuthModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
