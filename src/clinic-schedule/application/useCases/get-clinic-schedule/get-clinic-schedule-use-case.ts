import { AuthUser } from '../../../../auth/auth-user';
import { IClinicScheduleRepository } from '../../../domain/clinic-schedule.repository';

export type GetClinicScheduleInput = { user: AuthUser };

export class GetClinicScheduleUseCase {
  constructor(private readonly repository: IClinicScheduleRepository) {}

  execute({ user }: GetClinicScheduleInput) {
    return this.repository.get(user);
  }
}
