import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { AssistantChatMessageDto } from '../infra/http/assistant-chat.dto';

const DENTAL_ASSISTANT_INSTRUCTIONS = `You are DentCare's dental education assistant. Help dental professionals and platform users with general dental knowledge and product workflows.

Answer in the same language as the latest user message. Be clear, practical, and evidence-conscious. State uncertainty when appropriate and never invent sources, studies, or citations. Do not diagnose a specific person, prescribe medication, or create an individualized treatment plan. Explain that clinical decisions require assessment by a qualified dental professional and applicable local guidance. If a question describes difficulty breathing or swallowing, uncontrolled bleeding, severe facial swelling with fever, or significant trauma, advise urgent in-person medical or dental care. Do not ask for or repeat names, contact details, records, images, or other identifying patient information. If provided, do not use it; remind the user to remove it. Do not claim to access DentCare records or platform data.`;

@Injectable()
export class AssistantService {
  constructor(private readonly config: ConfigService) {}

  async chat(messages: AssistantChatMessageDto[]) {
    if (messages[messages.length - 1]?.role !== 'user') {
      throw new BadRequestException('The last message must be from the user');
    }

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
        new SystemMessage(DENTAL_ASSISTANT_INSTRUCTIONS),
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
      return { answer };
    } catch {
      throw new ServiceUnavailableException(
        'The dental assistant is temporarily unavailable',
      );
    }
  }
}
