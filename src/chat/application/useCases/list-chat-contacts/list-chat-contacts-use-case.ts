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
import { toChatContact } from '../shared/chat-rules';

export type ListChatContactsInput = { user: AuthUser; query?: ListQuery };

const CONTACT_ROLES = [
  'admin',
  'doctor',
  'nurse',
  'secretary',
  'receptionist',
  'patient',
];

export class ListChatContactsUseCase {
  constructor(private readonly repository: IChatRepository) {}

  async execute({ user, query = {} }: ListChatContactsInput) {
    validateListFilters(query, { role: CONTACT_ROLES });
    const createdAt = dateRange(query);
    const { skip, take } = pageWindow(query);
    const { contacts, total } = await this.repository.listContacts({
      branchId: user.branchId,
      excludedUserId: user.id,
      role: query.role,
      createdAtFrom: createdAt.gte,
      createdAtToExclusive: createdAt.lt,
      search: query.search,
      skip,
      take,
    });

    return paginated(contacts.map(toChatContact), total, query);
  }
}
