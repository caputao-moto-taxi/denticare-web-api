import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientDiagnosisCommand,
} from '../../../domain/patient.repository';

export type UpdatePatientDiagnosisInput = {
  user: AuthUser;
  id: string;
  diagnosisId: string;
  diagnosis: PatientDiagnosisCommand;
};

export class UpdatePatientDiagnosisUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, diagnosisId, diagnosis }: UpdatePatientDiagnosisInput) {
    return this.repository.updateDiagnosis(user, id, diagnosisId, diagnosis);
  }
}
