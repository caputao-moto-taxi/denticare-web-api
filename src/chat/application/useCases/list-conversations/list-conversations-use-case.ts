import { AuthUser } from '../../../../auth/auth-user';
import {
  ListQuery,
  pageWindow,
  paginated,
} from '../../../../shared/domain/list-query';
import {
  dateRange,
  validateListFilters,
} from '../../../../shared/helpers/list-filters';
import { IChatRepository } from '../../../domain/chat.repository';
import { toChatConversation } from '../shared/chat-rules';

const CONVERSATION_MESSAGE_WINDOW = 50;

export type ListConversationsInput = { user: AuthUser; query?: ListQuery };

export class ListConversationsUseCase {
  constructor(private readonly repository: IChatRepository) {}

  async execute({ user, query = {} }: ListConversationsInput) {
    validateListFilters(query, {
      category: ['staff', 'patients', 'post-care'],
    });
    const updatedAt = dateRange(query);
    const { skip, take } = pageWindow(query);
    const { conversations, total } = await this.repository.listConversations({
      branchId: user.branchId,
      participantId: user.id,
      category: query.category,
      updatedAtFrom: updatedAt.gte,
      updatedAtToExclusive: updatedAt.lt,
      search: query.search,
      skip,
      take,
      messageLimit: CONVERSATION_MESSAGE_WINDOW,
    });

    return paginated(
      conversations.map((conversation) =>
        toChatConversation(conversation, user.id),
      ),
      total,
      query,
    );
  }
}
