import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  badRequestResponse,
  errorResponse,
  HttpResponse,
  HttpResponseType,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository, PlanId } from '../../../domain';

type UpdatePlanInput = {
  id: string;
  name: string;
  price: number;
  currencyId: string;
  duration: number;
  totalBranch: number;
};

type UpdatePlanOutput =
  | {
      id: string;
      name: string;
      price: number;
      currencyId: string;
      duration: number;
      totalBranch: number;
    }
  | { message: string };

export class UpdatePlanUseCase implements IUseCase<
  UpdatePlanInput,
  UpdatePlanOutput
> {
  constructor(private readonly repository: IPlanRepository) {}

  async execute(
    input: UpdatePlanInput,
  ): Promise<HttpResponse<UpdatePlanOutput>> {
    try {
      const id = new PlanId(input.id);
      const plan = await this.repository.findById(id);
      if (!plan) {
        return new HttpResponseType({
          status: 404,
          data: { message: 'Plan not found' },
        });
      }

      const name = input.name.trim();
      if (
        !name ||
        input.price <= 0 ||
        input.duration < 1 ||
        input.totalBranch < 1
      ) {
        return badRequestResponse({ message: 'Invalid plan details.' });
      }

      if (
        plan.isOnPromotion &&
        plan.promotionalPrice != null &&
        plan.promotionalPrice >= input.price
      ) {
        return badRequestResponse({
          message:
            'The regular price must be greater than the active promotional price.',
        });
      }

      const details = {
        name,
        price: input.price,
        currencyId: input.currencyId,
        duration: input.duration,
        totalBranch: input.totalBranch,
      };
      await this.repository.updateDetails(id, details);

      return successResponse({
        id: id.value,
        ...details,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to update plan'),
      );
    }
  }
}
