import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockRestockCommand,
} from '../../../domain/stock.repository';

export type RestockStockItemInput = {
  user: AuthUser;
  id: string;
  input: StockRestockCommand;
};

export class RestockStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id, input }: RestockStockItemInput) {
    return this.repository.restock(user, id, input);
  }
}
