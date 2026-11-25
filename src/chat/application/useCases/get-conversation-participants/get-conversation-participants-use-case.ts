import { AuthUser } from '../../../../auth/auth-user';
import { IChatRepository } from '../../../domain/chat.repository';
import { requireConversationParticipant } from '../shared/chat-rules';

export type GetConversationParticipantsInput = {
  user: AuthUser;
  conversationId: string;
};

export class GetConversationParticipantsUseCase {
  constructor(private readonly repository: IChatRepository) {}

  async execute({ user, conversationId }: GetConversationParticipantsInput) {
    const { starterId, recipientId } = await requireConversationParticipant(
      this.repository,
      user,
      conversationId,
    );
    return { starterId, recipientId };
  }
}
