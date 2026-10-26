import { BadRequestException } from '@nestjs/common';
import { AssistantChatGateway } from '../../assistant-chat-gateway';
import { DENTAL_ASSISTANT_INSTRUCTIONS } from '../../assistant-instructions';
import { ChatAssistantUseCase } from './chat-assistant-use-case';

describe('ChatAssistantUseCase', () => {
  it('validates the latest message and returns the gateway response', async () => {
    const gateway = {
      complete: jest.fn().mockResolvedValue('General dental information'),
    };
    const useCase = new ChatAssistantUseCase(
      gateway as unknown as AssistantChatGateway,
    );
    const messages = [
      { role: 'user' as const, content: 'How does fluoride work?' },
    ];

    await expect(useCase.execute(messages)).resolves.toEqual({
      answer: 'General dental information',
    });
    expect(gateway.complete).toHaveBeenCalledWith(
      DENTAL_ASSISTANT_INSTRUCTIONS,
      messages,
    );
  });

  it('rejects conversations that do not end with a user message', async () => {
    const gateway = { complete: jest.fn() };
    const useCase = new ChatAssistantUseCase(
      gateway as unknown as AssistantChatGateway,
    );

    await expect(
      useCase.execute([{ role: 'assistant', content: 'An answer' }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(gateway.complete).not.toHaveBeenCalled();
  });
});
