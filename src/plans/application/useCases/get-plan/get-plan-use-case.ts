import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  HttpResponse,
} from '../../../../shared/contracts/httpContracts';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import { PlanId, Plan, IPlanRepository } from '../../../domain';
import { CreatePlanOutput, PlanOutputMapper } from '../../common/plan.output';

export type GetPlanInput = {
  id: string;
};

export class GetPlanUseCase implements IUseCase<GetPlanInput, GetPlanOutput> {
  constructor(private notificationRepository: IPlanRepository) {}

  async execute(
    input: GetPlanInput,
  ): Promise<HttpResponse<GetPlanOutput | any>> {
    try {
      const planId = new PlanId(input.id);
      const plan = await this.notificationRepository.findById(planId);

      if (!plan) {
        return badRequestResponse({
          message: `${new NotFoundError(input.id, Plan)}`,
        });
      }

      return successResponse(PlanOutputMapper.toOutput(plan));
    } catch (error: any) {
      return errorResponse(error);
    }
  }
}

export type GetPlanOutput = CreatePlanOutput;
