import { AuthUser } from '../../../../auth/auth-user';
import { IChatRepository } from '../../../domain/chat.repository';

export type GetConversationParticipantsInput = {
  user: AuthUser;
  conversationId: string;
};

export class GetConversationParticipantsUseCase {
  constructor(private readonly repository: IChatRepository) {}

  execute({ user, conversationId }: GetConversationParticipantsInput) {
    return this.repository.participants(user, conversationId);
  }
}
