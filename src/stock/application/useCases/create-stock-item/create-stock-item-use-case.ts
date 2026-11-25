import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockCreateCommand,
} from '../../../domain/stock.repository';
import {
  assertStockCapacity,
  normalizeStockText,
  requireStockStaff,
  stockCatalogError,
} from '../../stock-policies';

export type CreateStockItemInput = {
  user: AuthUser;
  input: StockCreateCommand;
};

export class CreateStockItemUseCase {
  constructor(private readonly repository: IStockRepository) {}

  async execute({ user, input }: CreateStockItemInput) {
    requireStockStaff(user);
    const capacity = input.capacity ?? input.quantity;
    assertStockCapacity(input.quantity, capacity);
    for (const [kind, name] of [
      ['category', input.category],
      ['supplier', input.supplier],
    ] as const) {
      if (!(await this.repository.hasCatalogEntry(user, kind, name.trim()))) {
        stockCatalogError(kind);
      }
    }

    return this.repository.create(
      user,
      normalizeStockText({
        ...input,
        capacity,
        salePrice: input.salePrice ?? input.unitCost,
      }),
    );
  }
}
