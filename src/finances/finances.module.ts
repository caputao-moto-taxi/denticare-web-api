import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';

@Module({
  imports: [AuthModule],
  controllers: [FinancesController],
  providers: [FinancesService],
})
export class FinancesModule {}
