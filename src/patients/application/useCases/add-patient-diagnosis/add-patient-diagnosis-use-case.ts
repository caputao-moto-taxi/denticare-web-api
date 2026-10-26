import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientDiagnosisCommand,
} from '../../../domain/patient.repository';
import { requirePatientClinicalAccess } from '../../patient-access.policy';
import {
  normalizePatientDiagnosis,
  toPatientDiagnosisView,
} from '../../patient-diagnosis.mapper';

export type AddPatientDiagnosisInput = {
  user: AuthUser;
  id: string;
  diagnosis: PatientDiagnosisCommand;
};

export class AddPatientDiagnosisUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  async execute({ user, id, diagnosis }: AddPatientDiagnosisInput) {
    requirePatientClinicalAccess(user);
    const record = await this.repository.addDiagnosis(
      user,
      id,
      normalizePatientDiagnosis(diagnosis),
    );
    return toPatientDiagnosisView(record);
  }
}
