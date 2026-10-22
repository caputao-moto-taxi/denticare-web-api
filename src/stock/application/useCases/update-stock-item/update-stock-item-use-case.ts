import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockUpdateCommand,
} from '../../../domain/stock.repository';

export type UpdateStockItemInput = {
  user: AuthUser;
  id: string;
  input: StockUpdateCommand;
};

export class UpdateStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id, input }: UpdateStockItemInput) {
    return this.repository.update(user, id, input);
  }
}
