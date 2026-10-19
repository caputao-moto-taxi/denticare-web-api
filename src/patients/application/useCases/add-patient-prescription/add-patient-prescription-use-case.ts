import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientPrescriptionCommand,
} from '../../../domain/patient.repository';

export type AddPatientPrescriptionInput = {
  user: AuthUser;
  id: string;
  prescription: PatientPrescriptionCommand;
};

export class AddPatientPrescriptionUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, prescription }: AddPatientPrescriptionInput) {
    return this.repository.addPrescription(user, id, prescription);
  }
}
