import { AuthUser } from '../../../auth/auth-user';
import { ListQuery } from '../../../shared/domain/list-query';
import {
  IStockRepository,
  StockCreateCommand,
  StockRestockCommand,
  StockSaleCreateCommand,
  StockUpdateCommand,
} from '../../domain/stock.repository';

export class StockUseCases {
  constructor(private readonly stockRepository: IStockRepository) {}

  list(user: AuthUser, query?: ListQuery) {
    return this.stockRepository.list(user, query);
  }

  findOne(user: AuthUser, id: string) {
    return this.stockRepository.findOne(user, id);
  }

  create(user: AuthUser, input: StockCreateCommand) {
    return this.stockRepository.create(user, input);
  }

  update(user: AuthUser, id: string, input: StockUpdateCommand) {
    return this.stockRepository.update(user, id, input);
  }

  restock(user: AuthUser, id: string, input: StockRestockCommand) {
    return this.stockRepository.restock(user, id, input);
  }

  remove(user: AuthUser, id: string) {
    return this.stockRepository.remove(user, id);
  }

  listSales(user: AuthUser, query?: ListQuery) {
    return this.stockRepository.listSales(user, query);
  }

  createSale(user: AuthUser, input: StockSaleCreateCommand) {
    return this.stockRepository.createSale(user, input);
  }
}
