import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';

export type GetPatientInput = { user: AuthUser; id: string };

export class GetPatientUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id }: GetPatientInput) {
    return this.repository.findOne(user, id);
  }
}
