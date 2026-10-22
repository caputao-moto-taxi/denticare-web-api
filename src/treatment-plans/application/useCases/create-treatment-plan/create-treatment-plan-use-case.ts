import { AuthUser } from '../../../../auth/auth-user';
import {
  ITreatmentPlanRepository,
  TreatmentPlanCreateCommand,
} from '../../../domain/treatment-plan.repository';

export type CreateTreatmentPlanInput = {
  user: AuthUser;
  input: TreatmentPlanCreateCommand;
};

export class CreateTreatmentPlanUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  execute({ user, input }: CreateTreatmentPlanInput) {
    return this.repository.create(user, input);
  }
}
