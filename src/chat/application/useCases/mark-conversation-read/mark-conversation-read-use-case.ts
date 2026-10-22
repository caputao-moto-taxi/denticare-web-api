import { AuthUser } from '../../../../auth/auth-user';
import { IChatRepository } from '../../../domain/chat.repository';
import { ChatRealtimeService } from '../../../infra/realtime/chat-realtime.service';

export type MarkConversationReadInput = {
  user: AuthUser;
  conversationId: string;
};

export class MarkConversationReadUseCase {
  constructor(
    private readonly repository: IChatRepository,
    private readonly realtime: ChatRealtimeService,
  ) {}

  async execute({ user, conversationId }: MarkConversationReadInput) {
    const result = await this.repository.markRead(user, conversationId);
    this.realtime.conversationRead(user.id, conversationId);
    return result;
  }
}
