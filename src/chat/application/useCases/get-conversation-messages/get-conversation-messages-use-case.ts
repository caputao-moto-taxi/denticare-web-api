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
import {
  requireConversationParticipant,
  toChatMessage,
} from '../shared/chat-rules';

export type GetConversationMessagesInput = {
  user: AuthUser;
  conversationId: string;
  query?: ListQuery;
};

export class GetConversationMessagesUseCase {
  constructor(private readonly repository: IChatRepository) {}

  async execute({
    user,
    conversationId,
    query = {},
  }: GetConversationMessagesInput) {
    validateListFilters(query);
    await requireConversationParticipant(this.repository, user, conversationId);
    const createdAt = dateRange(query);
    const { skip, take } = pageWindow(query);
    const { messages, total } = await this.repository.listMessages({
      conversationId,
      createdAtFrom: createdAt.gte,
      createdAtToExclusive: createdAt.lt,
      search: query.search,
      skip,
      take,
    });

    return paginated(
      [...messages].reverse().map((message) => toChatMessage(message, user.id)),
      total,
      query,
    );
  }
}
