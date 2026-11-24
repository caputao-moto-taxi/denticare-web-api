import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { FinanceQueryDto } from './finance-query.dto';
import { FinancesUseCases } from './application/finances.use-cases';

@Injectable()
export class FinancesService {
  constructor(private readonly useCases: FinancesUseCases) {}

  summary(user: AuthUser, query: FinanceQueryDto) {
    return this.useCases.summary(user, query);
  }

  movements(user: AuthUser, query: FinanceQueryDto) {
    return this.useCases.movements(user, query);
  }
}
