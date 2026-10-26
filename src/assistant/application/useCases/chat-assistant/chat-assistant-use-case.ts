import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AssistantChatGateway,
  AssistantChatMessage,
} from '../../assistant-chat-gateway';
import { DENTAL_ASSISTANT_INSTRUCTIONS } from '../../assistant-instructions';

@Injectable()
export class ChatAssistantUseCase {
  constructor(private readonly gateway: AssistantChatGateway) {}

  async execute(messages: AssistantChatMessage[]) {
    if (messages[messages.length - 1]?.role !== 'user') {
      throw new BadRequestException('The last message must be from the user');
    }

    return {
      answer: await this.gateway.complete(
        DENTAL_ASSISTANT_INSTRUCTIONS,
        messages,
      ),
    };
  }
}
