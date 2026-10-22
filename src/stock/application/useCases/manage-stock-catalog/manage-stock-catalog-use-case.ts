import { AuthUser } from '../../../../auth/auth-user';
import {
  IStockRepository,
  StockCatalogKind,
} from '../../../domain/stock.repository';

export class ManageStockCatalogUseCase {
  constructor(private readonly repository: IStockRepository) {}

  list(user: AuthUser, kind: StockCatalogKind) {
    return this.repository.listCatalog(user, kind);
  }

  create(user: AuthUser, kind: StockCatalogKind, name: string) {
    return this.repository.createCatalog(user, kind, name);
  }
}
