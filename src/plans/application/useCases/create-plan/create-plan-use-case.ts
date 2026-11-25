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
  CreatePlanOutput | { message: string }
> {
  constructor(private readonly _repository: IPlanRepository) {}

  async execute(
    input: CreatePlanInput,
  ): Promise<HttpResponse<CreatePlanOutput | { message: string }>> {
    try {
      if (
        input.isOnPromotion &&
        (input.promotionalPrice == null ||
          input.promotionalPrice <= 0 ||
          input.promotionalPrice >= input.price)
      ) {
        return badRequestResponse({
          message:
            'Promotional price must be positive and lower than the plan price.',
        });
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
    } catch (error: unknown) {
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to create plan'),
      );
    }
  }
}
