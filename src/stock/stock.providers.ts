import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { CreateStockItemUseCase } from './application/useCases/create-stock-item/create-stock-item-use-case';
import { CreateStockSaleUseCase } from './application/useCases/create-stock-sale/create-stock-sale-use-case';
import { GetStockItemUseCase } from './application/useCases/get-stock-item/get-stock-item-use-case';
import { GetStockSummaryUseCase } from './application/useCases/get-stock-summary/get-stock-summary-use-case';
import { GetStockSalesSummaryUseCase } from './application/useCases/get-stock-sales-summary/get-stock-sales-summary-use-case';
import { ListStockSalesUseCase } from './application/useCases/list-stock-sales/list-stock-sales-use-case';
import { ListStockUseCase } from './application/useCases/list-stock/list-stock-use-case';
import { RemoveStockItemUseCase } from './application/useCases/remove-stock-item/remove-stock-item-use-case';
import { RestockStockItemUseCase } from './application/useCases/restock-stock-item/restock-stock-item-use-case';
import { UpdateStockItemUseCase } from './application/useCases/update-stock-item/update-stock-item-use-case';
import { UpdateStockSaleUseCase } from './application/useCases/update-stock-sale/update-stock-sale-use-case';
import { ManageStockCatalogUseCase } from './application/useCases/manage-stock-catalog/manage-stock-catalog-use-case';
import { IStockRepository } from './domain/stock.repository';
import { StockPrismaRepository } from './infra/db/prisma/stock-prisma.repository';

const REPOSITORIES = {
  STOCK_REPOSITORY: {
    provide: 'StockRepository',
    useExisting: StockPrismaRepository,
  },
  STOCK_PRISMA_REPOSITORY: {
    provide: StockPrismaRepository,
    useFactory: (prismaService: PrismaService) =>
      new StockPrismaRepository(prismaService),
    inject: [PrismaService],
  },
};

const USE_CASES = {
  LIST: {
    provide: ListStockUseCase,
    useFactory: (repository: IStockRepository) =>
      new ListStockUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  GET: {
    provide: GetStockItemUseCase,
    useFactory: (repository: IStockRepository) =>
      new GetStockItemUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  GET_SUMMARY: {
    provide: GetStockSummaryUseCase,
    useFactory: (repository: IStockRepository) =>
      new GetStockSummaryUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  GET_SALES_SUMMARY: {
    provide: GetStockSalesSummaryUseCase,
    useFactory: (repository: IStockRepository) =>
      new GetStockSalesSummaryUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  CREATE: {
    provide: CreateStockItemUseCase,
    useFactory: (repository: IStockRepository) =>
      new CreateStockItemUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  UPDATE: {
    provide: UpdateStockItemUseCase,
    useFactory: (repository: IStockRepository) =>
      new UpdateStockItemUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  RESTOCK: {
    provide: RestockStockItemUseCase,
    useFactory: (repository: IStockRepository) =>
      new RestockStockItemUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  REMOVE: {
    provide: RemoveStockItemUseCase,
    useFactory: (repository: IStockRepository) =>
      new RemoveStockItemUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  LIST_SALES: {
    provide: ListStockSalesUseCase,
    useFactory: (repository: IStockRepository) =>
      new ListStockSalesUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  CREATE_SALE: {
    provide: CreateStockSaleUseCase,
    useFactory: (repository: IStockRepository) =>
      new CreateStockSaleUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  UPDATE_SALE: {
    provide: UpdateStockSaleUseCase,
    useFactory: (repository: IStockRepository) =>
      new UpdateStockSaleUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
  MANAGE_CATALOG: {
    provide: ManageStockCatalogUseCase,
    useFactory: (repository: IStockRepository) =>
      new ManageStockCatalogUseCase(repository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
};

export const STOCK_PROVIDERS = { REPOSITORIES, USE_CASES };
