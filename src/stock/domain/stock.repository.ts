import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';

export type StockCategory =
  | 'protection'
  | 'anesthesia'
  | 'instruments'
  | 'materials';

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

export abstract class IStockRepository {
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract findOne(user: AuthUser, id: string): Promise<unknown>;
  abstract create(user: AuthUser, input: StockCreateCommand): Promise<unknown>;
  abstract update(
    user: AuthUser,
    id: string,
    input: StockUpdateCommand,
  ): Promise<unknown>;
  abstract restock(
    user: AuthUser,
    id: string,
    input: StockRestockCommand,
  ): Promise<unknown>;
  abstract remove(user: AuthUser, id: string): Promise<unknown>;
  abstract listSales(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract createSale(
    user: AuthUser,
    input: StockSaleCreateCommand,
  ): Promise<unknown>;
}
