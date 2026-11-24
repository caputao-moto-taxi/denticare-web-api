import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockSaleCreateCommand,
  StockSaleItemWrite,
} from '../../../domain/stock.repository';
import { assertUniqueSaleItems, requireStockStaff } from '../../stock-policies';

export type CreateStockSaleInput = {
  user: AuthUser;
  input: StockSaleCreateCommand;
};

export class CreateStockSaleUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, input }: CreateStockSaleInput) {
    requireStockStaff(user);
    assertUniqueSaleItems(input.items.map((item) => item.stockItemId));
    return this.repository.withTransaction(async (transaction) => {
      const stockItemIds = input.items.map((line) => line.stockItemId);
      const currentItems = await transaction.findStockItems(user, stockItemIds);
      if (currentItems.length !== stockItemIds.length) {
        throw new NotFoundException('One or more stock items were not found');
      }

      const itemById = new Map(currentItems.map((item) => [item.id, item]));
      let totalCents = 0;
      const saleItems: StockSaleItemWrite[] = [];

      for (const line of input.items) {
        const stockItem = itemById.get(line.stockItemId);
        if (!stockItem) throw new NotFoundException('Stock item not found');

        const unitPriceCents = Math.round(stockItem.salePrice * 100);
        const lineTotalCents = unitPriceCents * line.quantity;
        if (
          !Number.isSafeInteger(unitPriceCents) ||
          !Number.isSafeInteger(lineTotalCents) ||
          !Number.isSafeInteger(totalCents + lineTotalCents)
        ) {
          throw new BadRequestException(
            'Sale total exceeds the supported limit',
          );
        }
        totalCents += lineTotalCents;

        const decremented = await transaction.decrementStock(
          user,
          stockItem.id,
          line.quantity,
        );
        if (!decremented) {
          throw new BadRequestException(
            `Insufficient stock for ${stockItem.name}`,
          );
        }

        saleItems.push({
          stockItemId: stockItem.id,
          itemName: stockItem.name,
          unit: stockItem.unit,
          quantity: line.quantity,
          unitPrice: unitPriceCents / 100,
          totalPrice: lineTotalCents / 100,
        });
      }

      return transaction.createSale(user, {
        customerName: input.customerName?.trim() || null,
        paymentMethod: input.paymentMethod,
        total: totalCents / 100,
        items: saleItems,
      });
    });
  }
}
