import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IChatRepository } from '../../../domain/chat.repository';

export type ListChatContactsInput = { user: AuthUser; query?: ListQuery };

export class ListChatContactsUseCase {
  constructor(private readonly repository: IChatRepository) {}

  execute({ user, query }: ListChatContactsInput) {
    return this.repository.contacts(user, query);
  }
}
