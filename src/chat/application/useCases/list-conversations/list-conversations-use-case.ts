import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IChatRepository } from '../../../domain/chat.repository';

export type ListConversationsInput = { user: AuthUser; query?: ListQuery };

export class ListConversationsUseCase {
  constructor(private readonly repository: IChatRepository) {}

  execute({ user, query }: ListConversationsInput) {
    return this.repository.list(user, query);
  }
}
