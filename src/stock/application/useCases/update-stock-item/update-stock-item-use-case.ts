import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockUpdateCommand,
} from '../../../domain/stock.repository';
import {
  assertStockCapacity,
  normalizeStockText,
  requireStockStaff,
  stockCatalogError,
} from '../../stock-policies';

export type UpdateStockItemInput = {
  user: AuthUser;
  id: string;
  input: StockUpdateCommand;
};

export class UpdateStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  async execute({ user, id, input }: UpdateStockItemInput) {
    requireStockStaff(user);
    if (
      input.category !== undefined &&
      !(await this.repository.hasCatalogEntry(
        user,
        'category',
        input.category.trim(),
      ))
    ) {
      stockCatalogError('category');
    }
    if (
      input.supplier !== undefined &&
      !(await this.repository.hasCatalogEntry(
        user,
        'supplier',
        input.supplier.trim(),
      ))
    ) {
      stockCatalogError('supplier');
    }
    const current = (await this.repository.findOne(user, id)) as {
      quantity: number;
      capacity: number;
    };
    assertStockCapacity(
      input.quantity ?? current.quantity,
      input.capacity ?? current.capacity,
    );
    return this.repository.update(user, id, normalizeStockText(input));
  }
}
