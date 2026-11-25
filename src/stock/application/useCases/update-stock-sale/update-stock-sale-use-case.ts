import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockSaleItemWrite,
  StockSaleUpdateCommand,
} from '../../../domain/stock.repository';
import { assertValidSaleUpdate, requireStockStaff } from '../../stock-policies';

export type UpdateStockSaleInput = {
  user: AuthUser;
  id: string;
  input: StockSaleUpdateCommand;
};

export class UpdateStockSaleUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute({ user, id, input }: UpdateStockSaleInput) {
    requireStockStaff(user);
    assertValidSaleUpdate(input.items.map((item) => item.stockItemId));
    return this.repository.withTransaction(async (transaction) => {
      const sale = await transaction.findSale(user, id);
      if (!sale) throw new NotFoundException('Stock sale not found');

      const currentSaleItems = new Map(
        sale.items.map((saleItem) => [saleItem.stockItemId, saleItem]),
      );
      const targetItems = new Map(
        input.items.map((line) => [line.stockItemId, line]),
      );
      const itemIds = [
        ...new Set([...currentSaleItems.keys(), ...targetItems.keys()]),
      ];
      const stockItems = await transaction.findStockItems(user, itemIds, true);
      const stockById = new Map(stockItems.map((item) => [item.id, item]));
      let totalCents = 0;
      const nextSaleItems: StockSaleItemWrite[] = input.items.map((line) => {
        const stockItem = stockById.get(line.stockItemId);
        const existingSaleItem = currentSaleItems.get(line.stockItemId);
        if (!stockItem || (!existingSaleItem && stockItem.deletedAt)) {
          throw new NotFoundException('One or more stock items were not found');
        }

        const unitPrice = existingSaleItem?.unitPrice ?? stockItem.salePrice;
        const unitPriceCents = Math.round(unitPrice * 100);
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

        return {
          stockItemId: stockItem.id,
          itemName: existingSaleItem?.itemName ?? stockItem.name,
          unit: existingSaleItem?.unit ?? stockItem.unit,
          quantity: line.quantity,
          unitPrice: unitPriceCents / 100,
          totalPrice: lineTotalCents / 100,
        };
      });

      for (const itemId of itemIds) {
        const stockItem = stockById.get(itemId);
        if (!stockItem) throw new NotFoundException('Stock item not found');

        const previousQuantity = currentSaleItems.get(itemId)?.quantity ?? 0;
        const nextQuantity = targetItems.get(itemId)?.quantity ?? 0;
        const quantity = stockItem.quantity + previousQuantity - nextQuantity;
        if (quantity < 0) {
          throw new BadRequestException(
            `Insufficient stock for ${stockItem.name}`,
          );
        }
        if (quantity > stockItem.capacity) {
          throw new BadRequestException(
            `Restored stock exceeds capacity for ${stockItem.name}`,
          );
        }
        if (quantity !== stockItem.quantity) {
          if (stockItem.deletedAt && quantity < stockItem.quantity) {
            throw new BadRequestException(
              `Deleted stock item ${stockItem.name} cannot be added to a sale`,
            );
          }
          const updated = await transaction.setStockQuantity(
            user,
            itemId,
            stockItem.quantity,
            quantity,
          );
          if (!updated) {
            throw new BadRequestException(
              `Stock changed while updating ${stockItem.name}; reload and try again`,
            );
          }
        }
      }

      return transaction.updateSale(id, totalCents / 100, nextSaleItems);
    });
  }
}
