import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IChatRepository } from '../../../domain/chat.repository';

export type GetConversationMessagesInput = {
  user: AuthUser;
  conversationId: string;
  query?: ListQuery;
};

export class GetConversationMessagesUseCase {
  constructor(private readonly repository: IChatRepository) {}

  execute({ user, conversationId, query }: GetConversationMessagesInput) {
    return this.repository.messages(user, conversationId, query);
  }
}
