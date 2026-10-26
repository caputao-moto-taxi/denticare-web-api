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

export type UpdatePatientDiagnosisInput = {
  user: AuthUser;
  id: string;
  diagnosisId: string;
  diagnosis: PatientDiagnosisCommand;
};

export class UpdatePatientDiagnosisUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  async execute({ user, id, diagnosisId, diagnosis }: UpdatePatientDiagnosisInput) {
    requirePatientClinicalAccess(user);
    const record = await this.repository.updateDiagnosis(
      user,
      id,
      diagnosisId,
      normalizePatientDiagnosis(diagnosis),
    );
    return toPatientDiagnosisView(record);
  }
}
