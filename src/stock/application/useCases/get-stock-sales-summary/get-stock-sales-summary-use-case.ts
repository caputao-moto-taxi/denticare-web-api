import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';

export class GetStockSalesSummaryUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute(user: AuthUser) {
    return this.repository.salesSummary(user);
  }
}
