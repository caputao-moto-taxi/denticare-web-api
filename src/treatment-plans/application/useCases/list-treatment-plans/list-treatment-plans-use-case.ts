import { AuthUser } from '../../../../auth/auth-user';
import { ListQuery } from '../../../../shared/domain/list-query';
import { ITreatmentPlanRepository } from '../../../domain/treatment-plan.repository';
import { validateListFilters } from '../../../../shared/helpers/list-filters';
import { TreatmentPlanPolicy } from '../../treatment-plan.policy';

export type ListTreatmentPlansInput = { user: AuthUser; query?: ListQuery };

export class ListTreatmentPlansUseCase {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  execute({ user, query }: ListTreatmentPlansInput) {
    TreatmentPlanPolicy.ensureCanView(user);
    validateListFilters(query ?? {}, {
      status: ['planned', 'in-progress', 'completed'],
      doctorId: true,
      patientId: true,
    });
    return this.repository.list(user, query);
  }
}
