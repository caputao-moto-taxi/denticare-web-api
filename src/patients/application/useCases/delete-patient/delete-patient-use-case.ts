import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';

export type DeletePatientInput = { user: AuthUser; id: string };

export class DeletePatientUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id }: DeletePatientInput) {
    return this.repository.remove(user, id);
  }
}
