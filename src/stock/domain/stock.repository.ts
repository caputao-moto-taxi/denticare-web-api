import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';

export type StockCategory = string;
export type StockCatalogKind = 'category' | 'supplier';

export type StockUnit = 'box' | 'unit' | 'pack' | 'bottle';

export type StockCreateCommand = {
  name: string;
  category: StockCategory;
  unit: StockUnit;
  quantity: number;
  capacity?: number;
  unitCost: number;
  salePrice?: number;
  supplier: string;
  notes?: string;
};

export type StockUpdateCommand = Partial<StockCreateCommand>;

export type StockRestockCommand = { amount?: number };
export type StockSaleCreateCommand = {
  customerName?: string;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  items: { stockItemId: string; quantity: number }[];
};
export type StockSaleUpdateCommand = {
  items: { stockItemId: string; quantity: number }[];
};

export type StockSummaryRow = {
  quantity: number;
  capacity: number;
  unitCost: number;
};

export type StockSalesSummaryData = {
  totals: {
    _count: { _all: number };
    _sum: { total: number | null };
    _avg: { total: number | null };
  };
  recentSales: { createdAt: Date; total: number }[];
  paymentMethods: {
    paymentMethod: string;
    _count: { _all: number };
    _sum: { total: number | null };
  }[];
  topProducts: {
    stockItemId: string;
    itemName: string;
    _sum: { quantity: number | null; totalPrice: number | null };
  }[];
};

export type StockItemSaleSnapshot = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  capacity: number;
  salePrice: number;
  deletedAt: Date | null;
};

export type StockSaleItemWrite = {
  stockItemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export interface IStockTransactionRepository {
  findStockItems(
    user: AuthUser,
    ids: string[],
    includeDeleted?: boolean,
  ): Promise<StockItemSaleSnapshot[]>;
  findSale(
    user: AuthUser,
    id: string,
  ): Promise<{ items: StockSaleItemWrite[] } | null>;
  restockItem(id: string, quantity: number, at: Date): Promise<unknown>;
  decrementStock(
    user: AuthUser,
    id: string,
    quantity: number,
  ): Promise<boolean>;
  setStockQuantity(
    user: AuthUser,
    id: string,
    expectedQuantity: number,
    quantity: number,
  ): Promise<boolean>;
  createSale(
    user: AuthUser,
    input: {
      paymentMethod: StockSaleCreateCommand['paymentMethod'];
      customerName: string | null;
      total: number;
      items: StockSaleItemWrite[];
    },
  ): Promise<unknown>;
  updateSale(
    id: string,
    total: number,
    items: StockSaleItemWrite[],
  ): Promise<unknown>;
}

export abstract class IStockRepository {
  abstract summary(user: AuthUser): Promise<StockSummaryRow[]>;
  abstract salesSummary(
    user: AuthUser,
    startDate: Date,
  ): Promise<StockSalesSummaryData>;
  abstract listCatalog(
    user: AuthUser,
    kind: StockCatalogKind,
  ): Promise<unknown>;
  abstract hasCatalogEntry(
    user: AuthUser,
    kind: StockCatalogKind,
    name: string,
  ): Promise<boolean>;
  abstract createCatalog(
    user: AuthUser,
    kind: StockCatalogKind,
    name: string,
  ): Promise<unknown>;
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract findOne(user: AuthUser, id: string): Promise<unknown>;
  abstract create(user: AuthUser, input: StockCreateCommand): Promise<unknown>;
  abstract update(
    user: AuthUser,
    id: string,
    input: StockUpdateCommand,
  ): Promise<unknown>;
  abstract withTransaction<T>(
    work: (transaction: IStockTransactionRepository) => Promise<T>,
  ): Promise<T>;
  abstract remove(user: AuthUser, id: string): Promise<unknown>;
  abstract listSales(user: AuthUser, query?: ListQuery): Promise<unknown>;
}
