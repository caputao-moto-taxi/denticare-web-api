import { AuthUser } from '../../../../auth/auth-user';
import { ITreatmentPlanRepository } from '../../../domain/treatment-plan.repository';

export type GetTreatmentPlanInput = { user: AuthUser; id: string };

export class GetTreatmentPlanUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  execute({ user, id }: GetTreatmentPlanInput) {
    return this.repository.findOne(user, id);
  }
}
