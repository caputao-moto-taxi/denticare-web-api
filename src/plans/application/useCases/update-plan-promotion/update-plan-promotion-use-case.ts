import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  badRequestResponse,
  errorResponse,
  HttpResponse,
  HttpResponseType,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository, PlanId } from '../../../domain';

type UpdatePlanPromotionInput = {
  id: string;
  isOnPromotion: boolean;
  promotionalPrice?: number;
  promotionalStartDate?: Date;
  promotionalEndDate?: Date;
};

type UpdatePlanPromotionOutput =
  | { id: string; isOnPromotion: boolean }
  | { message: string };

export class UpdatePlanPromotionUseCase implements IUseCase<
  UpdatePlanPromotionInput,
  UpdatePlanPromotionOutput
> {
  constructor(private readonly repository: IPlanRepository) {}

  async execute(
    input: UpdatePlanPromotionInput,
  ): Promise<HttpResponse<UpdatePlanPromotionOutput>> {
    try {
      const id = new PlanId(input.id);
      const plan = await this.repository.findById(id);
      if (!plan) {
        return new HttpResponseType({
          status: 404,
          data: { message: 'Plan not found' },
        });
      }

      if (
        input.isOnPromotion &&
        (input.promotionalPrice == null ||
          !Number.isFinite(input.promotionalPrice) ||
          input.promotionalPrice <= 0 ||
          input.promotionalPrice >= plan.price)
      ) {
        return badRequestResponse({
          message:
            'Promotional price must be positive and lower than the plan price.',
        });
      }

      const start = input.isOnPromotion
        ? (input.promotionalStartDate ?? null)
        : null;
      const end = input.isOnPromotion
        ? (input.promotionalEndDate ?? null)
        : null;

      if (start && end && start.getTime() > end.getTime()) {
        return badRequestResponse({
          message: 'Promotion end date must not be before its start date.',
        });
      }

      await this.repository.updatePromotion(id, {
        isOnPromotion: input.isOnPromotion,
        promotionalPrice: input.isOnPromotion
          ? (input.promotionalPrice ?? null)
          : null,
        promotionalStartAt: start,
        promotionalEndAt: end,
      });

      return successResponse({
        id: id.value,
        isOnPromotion: input.isOnPromotion,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error
          : new Error('Failed to update plan promotion'),
      );
    }
  }
}
