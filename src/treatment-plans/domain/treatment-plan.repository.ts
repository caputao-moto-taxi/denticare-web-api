import { AuthUser } from '../../auth/auth-user';
import { ListQuery } from '../../shared/domain/list-query';

export type TreatmentPlanCreateCommand = {
  patientId: string;
  doctorId: string;
  diagnosis: string;
  totalCost: number;
  totalSteps: number;
  notes?: string;
  startDate?: string;
  estimatedCompletion?: string;
  activePhase?: string;
};

export type TreatmentPlanUpdateCommand = Partial<
  Omit<TreatmentPlanCreateCommand, 'patientId'>
>;

export type TreatmentPlanProgressCommand = { completedSteps: number };

export abstract class ITreatmentPlanRepository {
  abstract list(user: AuthUser, query?: ListQuery): Promise<unknown>;
  abstract findOne(user: AuthUser, id: string): Promise<unknown>;
  abstract create(
    user: AuthUser,
    input: TreatmentPlanCreateCommand,
  ): Promise<unknown>;
  abstract update(
    user: AuthUser,
    id: string,
    input: TreatmentPlanUpdateCommand,
  ): Promise<unknown>;
  abstract setProgress(
    user: AuthUser,
    id: string,
    input: TreatmentPlanProgressCommand,
  ): Promise<unknown>;
  abstract remove(user: AuthUser, id: string): Promise<unknown>;
}
