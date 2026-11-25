import { AuthUser } from '../../../../auth/auth-user';
import {
  ITreatmentPlanRepository,
  TreatmentPlanCreateCommand,
} from '../../../domain/treatment-plan.repository';
import { NotFoundException } from '@nestjs/common';
import { TreatmentPlanPolicy } from '../../treatment-plan.policy';

export type CreateTreatmentPlanInput = {
  user: AuthUser;
  input: TreatmentPlanCreateCommand;
};

export class CreateTreatmentPlanUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  async execute({ user, input }: CreateTreatmentPlanInput) {
    TreatmentPlanPolicy.ensureCanManage(user);
    if (!(await this.repository.patientExists(user, input.patientId))) {
      throw new NotFoundException('Patient not found');
    }
    if (!(await this.repository.doctorExists(user, input.doctorId))) {
      throw new NotFoundException('Doctor not found');
    }
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const estimatedCompletion = input.estimatedCompletion
      ? new Date(input.estimatedCompletion)
      : null;
    TreatmentPlanPolicy.validateDates(startDate, estimatedCompletion);
    return this.repository.create(user, {
      ...input,
      diagnosis: input.diagnosis.trim(),
      startDate: startDate.toISOString(),
      estimatedCompletion: estimatedCompletion?.toISOString(),
      notes: input.notes?.trim() || undefined,
      activePhase: input.activePhase?.trim() || undefined,
    });
  }
}
