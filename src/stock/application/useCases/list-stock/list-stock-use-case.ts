import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IStockRepository } from '../../../domain/stock.repository';
import {
  assertValidStockListQuery,
  requireStockStaff,
} from '../../stock-policies';

export type ListStockInput = { user: AuthUser; query?: ListQuery };

export class ListStockUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, query }: ListStockInput) {
    requireStockStaff(user);
    assertValidStockListQuery(query, { category: true });
    return this.repository.list(user, query);
  }
}
