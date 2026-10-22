import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientStatusCommand,
} from '../../../domain/patient.repository';

export type SetPatientStatusInput = {
  user: AuthUser;
  id: string;
  status: PatientStatusCommand;
};

export class SetPatientStatusUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, status }: SetPatientStatusInput) {
    return this.repository.setStatus(user, id, status);
  }
}
