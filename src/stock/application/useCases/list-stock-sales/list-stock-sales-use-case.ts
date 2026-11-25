import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { IStockRepository } from '../../../domain/stock.repository';
import { requireStockStaff } from '../../stock-policies';

export type ListStockSalesInput = { user: AuthUser; query?: ListQuery };

export class ListStockSalesUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, query }: ListStockSalesInput) {
    requireStockStaff(user);
    return this.repository.listSales(user, query);
  }
}
