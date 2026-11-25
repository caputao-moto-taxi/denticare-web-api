import { AuthUser } from '../../../../auth/auth-user';
import { BadRequestException } from '@nestjs/common';
import {
  ITreatmentPlanRepository,
  TreatmentPlanProgressCommand,
} from '../../../domain/treatment-plan.repository';
import { TreatmentPlanPolicy } from '../../treatment-plan.policy';

export type SetTreatmentPlanProgressInput = {
  user: AuthUser;
  id: string;
  input: TreatmentPlanProgressCommand;
};

export class SetTreatmentPlanProgressUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  async execute({ user, id, input }: SetTreatmentPlanProgressInput) {
    TreatmentPlanPolicy.ensureCanRecordProgress(user);
    const plan = await this.repository.findOne(user, id);
    TreatmentPlanPolicy.ensureProgressWithinPlan(
      input.completedSteps,
      plan.totalSteps,
    );
    const updated = await this.repository.setProgress(user, id, input);
    if (!updated) {
      throw new BadRequestException(
        'Completed steps cannot exceed the total steps',
      );
    }
    return updated;
  }
}
