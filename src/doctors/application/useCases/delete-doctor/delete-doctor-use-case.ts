import { AuthUser } from '../../../../auth/auth-user';
import { IDoctorRepository } from '../../../domain/doctor.repository';
import { DoctorManagementPolicy } from '../../doctor-management.policy';

export type DeleteDoctorInput = { user: AuthUser; id: string };

export class DeleteDoctorUseCase {
  constructor(private readonly repository: IDoctorRepository) {}

  execute({ user, id }: DeleteDoctorInput) {
    DoctorManagementPolicy.ensureCanRemove(user);
    return this.repository.remove(user, id);
  }
}
