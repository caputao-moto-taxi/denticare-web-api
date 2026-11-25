import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';
import { FinancesUseCases } from './application/finances.use-cases';
import { FinancesPrismaRepository } from './infra/db/prisma/finances-prisma.repository';

@Module({
  imports: [AuthModule],
  controllers: [FinancesController],
  providers: [
    FinancesService,
    FinancesPrismaRepository,
    {
      provide: 'FinancesRepository',
      useExisting: FinancesPrismaRepository,
    },
    {
      provide: FinancesUseCases,
      useFactory: (
        repository: import('./domain/finances.repository').IFinancesRepository,
      ) => new FinancesUseCases(repository),
      inject: ['FinancesRepository'],
    },
  ],
})
export class FinancesModule {}
