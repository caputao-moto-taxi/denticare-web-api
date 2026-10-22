import { AuthUser } from '../../../../auth/auth-user';
import { ITreatmentPlanRepository } from '../../../domain/treatment-plan.repository';

export type DeleteTreatmentPlanInput = { user: AuthUser; id: string };

export class DeleteTreatmentPlanUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  execute({ user, id }: DeleteTreatmentPlanInput) {
    return this.repository.remove(user, id);
  }
}
