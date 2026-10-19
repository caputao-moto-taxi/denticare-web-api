import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientCreateCommand,
} from '../../../domain/patient.repository';

export type CreatePatientInput = {
  user: AuthUser;
  patient: PatientCreateCommand;
};

export class CreatePatientUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, patient }: CreatePatientInput) {
    return this.repository.create(user, patient);
  }
}
