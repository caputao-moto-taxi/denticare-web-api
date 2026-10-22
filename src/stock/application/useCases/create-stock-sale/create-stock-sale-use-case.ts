import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockSaleCreateCommand,
} from '../../../domain/stock.repository';

export type CreateStockSaleInput = {
  user: AuthUser;
  input: StockSaleCreateCommand;
};

export class CreateStockSaleUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, input }: CreateStockSaleInput) {
    return this.repository.createSale(user, input);
  }
}
