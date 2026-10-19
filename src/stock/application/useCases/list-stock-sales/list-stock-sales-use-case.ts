import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IStockRepository } from '../../../domain/stock.repository';

export type ListStockSalesInput = { user: AuthUser; query?: ListQuery };

export class ListStockSalesUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, query }: ListStockSalesInput) {
    return this.repository.listSales(user, query);
  }
}
