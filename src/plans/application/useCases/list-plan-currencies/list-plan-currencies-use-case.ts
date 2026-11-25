import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  errorResponse,
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository, PlanCurrency } from '../../../domain';

export class ListPlanCurrenciesUseCase implements IUseCase<
  void,
  PlanCurrency[]
> {
  constructor(private readonly repository: IPlanRepository) {}

  async execute(): Promise<HttpResponse<PlanCurrency[]>> {
    try {
      return successResponse(await this.repository.listCurrencies());
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error
          : new Error('Failed to list plan currencies'),
      );
    }
  }
}
