import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';

export type GetPatientDetailsInput = { user: AuthUser; id: string };

export class GetPatientDetailsUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id }: GetPatientDetailsInput) {
    return this.repository.details(user, id);
  }
}
