import { AuthUser } from '../../../../auth/auth-user';
import { IChatRepository } from '../../../domain/chat.repository';

export type GetUnreadCountInput = { user: AuthUser };

export class GetUnreadCountUseCase {
  constructor(private readonly repository: IChatRepository) {}

  execute({ user }: GetUnreadCountInput) {
    return this.repository.unreadCount(user);
  }
}
