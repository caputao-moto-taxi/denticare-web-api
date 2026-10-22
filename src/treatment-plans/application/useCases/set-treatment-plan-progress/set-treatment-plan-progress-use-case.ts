import { AuthUser } from '../../../../auth/auth-user';
import {
  ITreatmentPlanRepository,
  TreatmentPlanProgressCommand,
} from '../../../domain/treatment-plan.repository';

export type SetTreatmentPlanProgressInput = {
  user: AuthUser;
  id: string;
  input: TreatmentPlanProgressCommand;
};

export class SetTreatmentPlanProgressUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  execute({ user, id, input }: SetTreatmentPlanProgressInput) {
    return this.repository.setProgress(user, id, input);
  }
}
