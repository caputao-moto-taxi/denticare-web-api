import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';

export type RemoveStockItemInput = { user: AuthUser; id: string };

export class RemoveStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id }: RemoveStockItemInput) {
    return this.repository.remove(user, id);
  }
}
