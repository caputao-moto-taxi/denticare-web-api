import { AuthUser } from '../../../../auth/auth-user';
import {
  ITreatmentPlanRepository,
  TreatmentPlanUpdateCommand,
} from '../../../domain/treatment-plan.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TreatmentPlanPolicy } from '../../treatment-plan.policy';

export type UpdateTreatmentPlanInput = {
  user: AuthUser;
  id: string;
  input: TreatmentPlanUpdateCommand;
};

export class UpdateTreatmentPlanUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  async execute({ user, id, input }: UpdateTreatmentPlanInput) {
    TreatmentPlanPolicy.ensureCanManage(user);
    const current = await this.repository.findOne(user, id);
    if (
      input.doctorId &&
      !(await this.repository.doctorExists(user, input.doctorId))
    ) {
      throw new NotFoundException('Doctor not found');
    }
    const totalSteps = input.totalSteps ?? current.totalSteps;
    TreatmentPlanPolicy.ensureTotalStepsNotBelowProgress(
      totalSteps,
      current.completedSteps,
    );
    const startDate = input.startDate
      ? new Date(input.startDate)
      : new Date(current.date);
    const estimatedCompletion =
      input.estimatedCompletion === undefined
        ? current.estimatedCompletion
          ? new Date(current.estimatedCompletion)
          : null
        : input.estimatedCompletion
          ? new Date(input.estimatedCompletion)
          : null;
    TreatmentPlanPolicy.validateDates(startDate, estimatedCompletion);
    const updated = await this.repository.update(user, id, {
      ...input,
      ...(input.diagnosis !== undefined && {
        diagnosis: input.diagnosis.trim(),
      }),
      ...(input.notes !== undefined && { notes: input.notes.trim() }),
      totalSteps,
      ...(input.startDate !== undefined && {
        startDate: startDate.toISOString(),
      }),
      ...(input.estimatedCompletion !== undefined && {
        estimatedCompletion: estimatedCompletion?.toISOString(),
      }),
      ...(input.activePhase !== undefined && {
        activePhase: input.activePhase.trim(),
      }),
    });
    if (!updated) {
      throw new BadRequestException(
        'Total steps cannot be lower than the completed steps',
      );
    }
    return updated;
  }
}
