import { FinanceQueryDto } from '../finance-query.dto';

export type FinanceMovement = {
  id: string;
  reference: string;
  description: string;
  patientName: string;
  source: 'patient' | 'stock';
  amount: number;
  method: string;
  status: 'paid' | 'pending';
  date: string;
};

export abstract class IFinancesRepository {
  abstract movements(
    branchId: string,
    query: FinanceQueryDto,
  ): Promise<FinanceMovement[]>;
}
