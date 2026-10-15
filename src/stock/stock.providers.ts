import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { StockUseCases } from './application/useCases/stock.use-cases';
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
  STOCK_USE_CASES: {
    provide: StockUseCases,
    useFactory: (stockRepository: IStockRepository) =>
      new StockUseCases(stockRepository),
    inject: [REPOSITORIES.STOCK_REPOSITORY.provide],
  },
};

export const STOCK_PROVIDERS = { REPOSITORIES, USE_CASES };
