import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  badRequestResponse,
  errorResponse,
  HttpResponse,
  successResponse,
} from '../../../../shared/contracts/httpContracts';

import { IPlanRepository, Plan } from '../../../domain';
import { CreatePlanOutput, PlanOutputMapper } from '../../common/plan.output';
import { CreatePlanInput } from './plan.input';

export class CreatePlanUseCase implements IUseCase<
  CreatePlanInput,
  CreatePlanOutput
> {
  constructor(private readonly _repository: IPlanRepository) { }

  async execute(
    input: CreatePlanInput,
  ): Promise<HttpResponse<CreatePlanOutput | any>> {
    try {
      if (input.isOnPromotion === true && input.promotionalPrice === null || 0) {
        return badRequestResponse({ message: 'Promotional price must be provided when the plan is on promotion.' });
      }

      const newPlan = Plan.create({
        name: input.name,
        price: input.price,
        currencyId: input.currencyId,
        duration: input.duration,
        isOnPromotion: input.isOnPromotion,
        promotionalPrice: input.promotionalPrice,
        promotionalStartAt: input.promotionalStartDate,
        promotionalEndAt: input.promotionalEndDate,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
        totalBranch: input.totalBranch ? input.totalBranch : 1,
      });

      await this._repository.insert(newPlan);

      return successResponse(PlanOutputMapper.toOutput(newPlan));
    } catch (error: any) {
      return errorResponse(error.message);
    }
  }
}
