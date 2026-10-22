import { AuthUser } from '../../../../auth/auth-user';
import {
  IClinicScheduleRepository,
  UpdateClinicScheduleCommand,
} from '../../../domain/clinic-schedule.repository';

export type UpdateClinicScheduleInput = {
  user: AuthUser;
  schedule: UpdateClinicScheduleCommand;
};

export class UpdateClinicScheduleUseCase {
  constructor(private readonly repository: IClinicScheduleRepository) {}

  execute({ user, schedule }: UpdateClinicScheduleInput) {
    return this.repository.update(user, schedule);
  }
}
