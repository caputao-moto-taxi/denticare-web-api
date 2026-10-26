import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientToothCommand,
} from '../../../domain/patient.repository';
import { requirePatientClinicalAccess } from '../../patient-access.policy';

export type UpdatePatientToothInput = {
  user: AuthUser;
  id: string;
  tooth: PatientToothCommand;
};

export class UpdatePatientToothUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, tooth }: UpdatePatientToothInput) {
    requirePatientClinicalAccess(user);
    return this.repository.updateTooth(user, id, {
      ...tooth,
      procedureDone: tooth.procedureDone?.trim() || null,
      notes: tooth.notes?.trim() || null,
    });
  }
}
