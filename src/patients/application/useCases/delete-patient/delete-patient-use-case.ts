import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';
import { requirePatientStaff } from '../../patient-access.policy';

export type DeletePatientInput = { user: AuthUser; id: string };

export class DeletePatientUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id }: DeletePatientInput) {
    requirePatientStaff(user);
    return this.repository.remove(user, id);
  }
}
