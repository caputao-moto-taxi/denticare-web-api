import { AuthUser } from '../../../../auth/auth-user';
import {
  DoctorUpdateCommand,
  IDoctorRepository,
} from '../../../domain/doctor.repository';
import { DoctorManagementPolicy } from '../../doctor-management.policy';

export type UpdateDoctorInput = {
  user: AuthUser;
  id: string;
  changes: DoctorUpdateCommand;
};

export class UpdateDoctorUseCase {
  constructor(private readonly repository: IDoctorRepository) {}

  execute({ user, id, changes }: UpdateDoctorInput) {
    DoctorManagementPolicy.ensureCanUpdate(user, id);
    return this.repository.update(user, id, changes);
  }
}
