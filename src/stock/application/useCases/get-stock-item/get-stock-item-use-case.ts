import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';

export type GetStockItemInput = { user: AuthUser; id: string };

export class GetStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id }: GetStockItemInput) {
    return this.repository.findOne(user, id);
  }
}
