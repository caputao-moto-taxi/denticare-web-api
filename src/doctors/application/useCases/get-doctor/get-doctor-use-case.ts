import { AuthUser } from '../../../../auth/auth-user';
import { IDoctorRepository } from '../../../domain/doctor.repository';

export type GetDoctorInput = { user: AuthUser; id: string };

export class GetDoctorUseCase {
  constructor(private readonly repository: IDoctorRepository) {}

  execute({ user, id }: GetDoctorInput) {
    return this.repository.findOne(user, id);
  }
}
