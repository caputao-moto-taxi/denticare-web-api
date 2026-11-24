import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockRestockCommand,
} from '../../../domain/stock.repository';
import { assertStockCapacity, requireStockStaff } from '../../stock-policies';

export type RestockStockItemInput = {
  user: AuthUser;
  id: string;
  input: StockRestockCommand;
};

export class RestockStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  async execute({ user, id, input }: RestockStockItemInput) {
    requireStockStaff(user);
    return this.repository.withTransaction(async (transaction) => {
      const current = await transaction.findStockItems(user, [id]);
      const item = current[0];
      if (!item) throw new NotFoundException('Stock item not found');

      const quantity =
        input.amount === undefined
          ? item.capacity
          : item.quantity + input.amount;
      assertStockCapacity(quantity, item.capacity);

      return transaction.restockItem(item.id, quantity, new Date());
    });
  }
}
