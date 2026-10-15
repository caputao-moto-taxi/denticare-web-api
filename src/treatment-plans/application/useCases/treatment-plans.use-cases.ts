import { AuthUser } from '../../../auth/auth-user';
import { ListQuery } from '../../../shared/domain/list-query';
import {
  ITreatmentPlanRepository,
  TreatmentPlanCreateCommand,
  TreatmentPlanProgressCommand,
  TreatmentPlanUpdateCommand,
} from '../../domain/treatment-plan.repository';

export class TreatmentPlansUseCases {
  constructor(private readonly repository: ITreatmentPlanRepository) {}

  list(user: AuthUser, query?: ListQuery) {
    return this.repository.list(user, query);
  }

  findOne(user: AuthUser, id: string) {
    return this.repository.findOne(user, id);
  }

  create(user: AuthUser, input: TreatmentPlanCreateCommand) {
    return this.repository.create(user, input);
  }

  update(user: AuthUser, id: string, input: TreatmentPlanUpdateCommand) {
    return this.repository.update(user, id, input);
  }

  setProgress(user: AuthUser, id: string, input: TreatmentPlanProgressCommand) {
    return this.repository.setProgress(user, id, input);
  }

  remove(user: AuthUser, id: string) {
    return this.repository.remove(user, id);
  }
}
