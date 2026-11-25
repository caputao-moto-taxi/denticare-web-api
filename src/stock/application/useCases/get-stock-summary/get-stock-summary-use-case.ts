import { AuthUser } from '../../../../auth/auth-user';
import { IStockRepository } from '../../../domain/stock.repository';
import { requireStockStaff } from '../../stock-policies';

export class GetStockSummaryUseCase {
  constructor(private readonly repository: IStockRepository) {}

  execute(user: AuthUser) {
    requireStockStaff(user);
    return this.repository.summary(user).then((items) =>
      items.reduce(
        (summary, item) => ({
          productCount: summary.productCount + 1,
          totalUnits: summary.totalUnits + item.quantity,
          lowStockCount:
            summary.lowStockCount +
            (item.quantity <= Math.max(1, Math.ceil(item.capacity * 0.2))
              ? 1
              : 0),
          inventoryCost: summary.inventoryCost + item.quantity * item.unitCost,
        }),
        { productCount: 0, totalUnits: 0, lowStockCount: 0, inventoryCost: 0 },
      ),
    );
  }
}
