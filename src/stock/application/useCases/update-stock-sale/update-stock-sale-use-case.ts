import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockSaleUpdateCommand,
} from '../../../domain/stock.repository';

export type UpdateStockSaleInput = {
  user: AuthUser;
  id: string;
  input: StockSaleUpdateCommand;
};

export class UpdateStockSaleUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id, input }: UpdateStockSaleInput) {
    return this.repository.updateSale(user, id, input);
  }
}
