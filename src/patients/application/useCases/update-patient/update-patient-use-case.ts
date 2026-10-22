import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientUpdateCommand,
} from '../../../domain/patient.repository';

export type UpdatePatientInput = {
  user: AuthUser;
  id: string;
  changes: PatientUpdateCommand;
};

export class UpdatePatientUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, changes }: UpdatePatientInput) {
    return this.repository.update(user, id, changes);
  }
}
