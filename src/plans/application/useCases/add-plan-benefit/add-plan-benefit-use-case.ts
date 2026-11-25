import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  badRequestResponse,
  errorResponse,
  HttpResponse,
  HttpResponseType,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository, PlanBenefitOutput, PlanId } from '../../../domain';

type AddPlanBenefitInput = {
  planId: string;
  name: string;
  details?: string;
};

type AddPlanBenefitResult = PlanBenefitOutput | { message: string };

export class AddPlanBenefitUseCase implements IUseCase<
  AddPlanBenefitInput,
  AddPlanBenefitResult
> {
  constructor(private readonly repository: IPlanRepository) {}

  async execute(
    input: AddPlanBenefitInput,
  ): Promise<HttpResponse<AddPlanBenefitResult>> {
    try {
      const planId = new PlanId(input.planId);
      const plan = await this.repository.findById(planId);
      if (!plan) {
        return new HttpResponseType({
          status: 404,
          data: { message: 'Plan not found' },
        });
      }

      const name = input.name.trim();
      if (!name) {
        return badRequestResponse({ message: 'Benefit name is required.' });
      }

      const benefit = await this.repository.addBenefit(planId, {
        name,
        details: input.details?.trim() || null,
      });

      return successResponse(benefit);
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error
          : new Error('Failed to add plan benefit'),
      );
    }
  }
}
