import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IStockRepository } from '../../../domain/stock.repository';

export type ListStockInput = { user: AuthUser; query?: ListQuery };

export class ListStockUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, query }: ListStockInput) {
    return this.repository.list(user, query);
  }
}
