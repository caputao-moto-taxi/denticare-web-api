import { AuthUser } from '../../../../auth/auth-user';
import { IChatRepository } from '../../../domain/chat.repository';
import { ChatRealtimeService } from '../../../infra/realtime/chat-realtime.service';
import { requireConversationParticipant } from '../shared/chat-rules';

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
    const conversation = await requireConversationParticipant(
      this.repository,
      user,
      conversationId,
    );
    const readAt = new Date();
    await this.repository.updateConversation(conversationId, {
      ...(conversation.starterId === user.id
        ? { starterLastReadAt: readAt }
        : { recipientLastReadAt: readAt }),
    });
    this.realtime.conversationRead(user.id, conversationId);
    return { id: conversationId, unreadCount: 0 };
  }
}
