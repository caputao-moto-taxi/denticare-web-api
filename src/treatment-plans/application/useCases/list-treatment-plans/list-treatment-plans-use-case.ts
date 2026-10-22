import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { ITreatmentPlanRepository } from '../../../domain/treatment-plan.repository';

export type ListTreatmentPlansInput = { user: AuthUser; query?: ListQuery };

export class ListTreatmentPlansUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  execute({ user, query }: ListTreatmentPlansInput) {
    return this.repository.list(user, query);
  }
}
