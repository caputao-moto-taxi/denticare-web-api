import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockCreateCommand,
} from '../../../domain/stock.repository';

export type CreateStockItemInput = {
  user: AuthUser;
  input: StockCreateCommand;
};

export class CreateStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, input }: CreateStockItemInput) {
    return this.repository.create(user, input);
  }
}
