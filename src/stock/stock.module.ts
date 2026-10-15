import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StockController } from './infra/http/controllers/stock.controller';
import { STOCK_PROVIDERS } from './stock.providers';

@Module({
  imports: [AuthModule],
  controllers: [StockController],
  providers: [
    ...Object.values(STOCK_PROVIDERS.REPOSITORIES),
    ...Object.values(STOCK_PROVIDERS.USE_CASES),
  ],
})
export class StockModule {}
