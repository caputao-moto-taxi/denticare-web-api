import { AuthUser } from '../../../auth/auth-user';
import {
  IClinicScheduleRepository,
  UpdateClinicScheduleCommand,
} from '../../domain/clinic-schedule.repository';

export class ClinicScheduleUseCases {
  constructor(private readonly repository: IClinicScheduleRepository) {}

  get(user: AuthUser) {
    return this.repository.get(user);
  }

  update(user: AuthUser, input: UpdateClinicScheduleCommand) {
    return this.repository.update(user, input);
  }
}
