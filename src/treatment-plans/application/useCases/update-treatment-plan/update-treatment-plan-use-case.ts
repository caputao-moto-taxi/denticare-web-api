import { AuthUser } from '../../../../auth/auth-user';
import {
  ITreatmentPlanRepository,
  TreatmentPlanUpdateCommand,
} from '../../../domain/treatment-plan.repository';

export type UpdateTreatmentPlanInput = {
  user: AuthUser;
  id: string;
  input: TreatmentPlanUpdateCommand;
};

export class UpdateTreatmentPlanUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  execute({ user, id, input }: UpdateTreatmentPlanInput) {
    return this.repository.update(user, id, input);
  }
}
