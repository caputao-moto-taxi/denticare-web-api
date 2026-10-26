import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import {
  AssistantChatGateway,
  AssistantChatMessage,
} from '../../application/assistant-chat-gateway';

@Injectable()
export class LangChainAssistantChatGateway implements AssistantChatGateway {
  constructor(private readonly config: ConfigService) {}

  async complete(
    instructions: string,
    messages: AssistantChatMessage[],
  ): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'The dental assistant is not configured',
      );
    }

    const model =
      this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-4o-mini';
    const chatModel = new ChatOpenAI({
      apiKey,
      model,
      temperature: 0.2,
      maxTokens: 800,
      maxRetries: 1,
    });
    const conversation = messages.map(({ role, content }) =>
      role === 'assistant' ? new AIMessage(content) : new HumanMessage(content),
    );

    try {
      const result = await chatModel.invoke([
        new SystemMessage(instructions),
        ...conversation,
      ]);
      const answer =
        typeof result.content === 'string'
          ? result.content.trim()
          : result.content
              .map((part) =>
                typeof part === 'string'
                  ? part
                  : part.type === 'text'
                    ? part.text
                    : '',
              )
              .join('')
              .trim();

      if (!answer) {
        throw new Error('The model returned an empty answer');
      }
      return answer;
    } catch {
      throw new ServiceUnavailableException(
        'The dental assistant is temporarily unavailable',
      );
    }
  }
}
