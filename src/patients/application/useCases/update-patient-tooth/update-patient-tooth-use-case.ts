import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientToothCommand,
} from '../../../domain/patient.repository';

export type UpdatePatientToothInput = {
  user: AuthUser;
  id: string;
  tooth: PatientToothCommand;
};

export class UpdatePatientToothUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, tooth }: UpdatePatientToothInput) {
    return this.repository.updateTooth(user, id, tooth);
  }
}
