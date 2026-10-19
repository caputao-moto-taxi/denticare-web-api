import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';

export class GetStockSummaryUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute(user: AuthUser) {
    return this.repository.summary(user);
  }
}
