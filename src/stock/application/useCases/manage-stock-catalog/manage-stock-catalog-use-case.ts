import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockCatalogKind,
} from '../../../domain/stock.repository';
import { normalizeCatalogName, requireStockStaff } from '../../stock-policies';

export class ManageStockCatalogUseCase {
  constructor(private readonly repository: IStockRepository) {}

  list(user: AuthUser, kind: StockCatalogKind) {
    requireStockStaff(user);
    return this.repository.listCatalog(user, kind);
  }

  create(user: AuthUser, kind: StockCatalogKind, name: string) {
    requireStockStaff(user);
    const normalized = normalizeCatalogName(kind, name);
    return this.repository.createCatalog(
      user,
      normalized.kind,
      normalized.name,
    );
  }
}
