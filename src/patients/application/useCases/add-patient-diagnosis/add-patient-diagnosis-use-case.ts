import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientDiagnosisCommand,
} from '../../../domain/patient.repository';

export type AddPatientDiagnosisInput = {
  user: AuthUser;
  id: string;
  diagnosis: PatientDiagnosisCommand;
};

export class AddPatientDiagnosisUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, diagnosis }: AddPatientDiagnosisInput) {
    return this.repository.addDiagnosis(user, id, diagnosis);
  }
}
