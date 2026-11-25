import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';
import { requireStockStaff } from '../../stock-policies';

export type GetStockItemInput = { user: AuthUser; id: string };

export class GetStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id }: GetStockItemInput) {
    requireStockStaff(user);
    return this.repository.findOne(user, id);
  }
}
