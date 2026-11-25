import { IUseCase } from '../../../../shared/application/use-case.interface';
import {
  errorResponse,
  HttpResponse,
  HttpResponseType,
  successResponse,
} from '../../../../shared/contracts/httpContracts';
import { IPlanRepository, PlanId } from '../../../domain';

type DeletePlanInput = { id: string };
type DeletePlanOutput = { id: string } | { message: string };

export class DeletePlanUseCase implements IUseCase<
  DeletePlanInput,
  DeletePlanOutput
> {
  constructor(private readonly repository: IPlanRepository) {}

  async execute(
    input: DeletePlanInput,
  ): Promise<HttpResponse<DeletePlanOutput>> {
    try {
      const id = new PlanId(input.id);
      const plan = await this.repository.findById(id);
      if (!plan) {
        return new HttpResponseType({
          status: 404,
          data: { message: 'Plan not found' },
        });
      }

      await this.repository.delete(id);
      return successResponse({ id: id.value });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to remove plan'),
      );
    }
  }
}
