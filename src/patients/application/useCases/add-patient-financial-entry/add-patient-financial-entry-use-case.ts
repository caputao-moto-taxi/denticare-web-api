import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientFinancialEntryCommand,
} from '../../../domain/patient.repository';

export type AddPatientFinancialEntryInput = {
  user: AuthUser;
  id: string;
  financialEntry: PatientFinancialEntryCommand;
};

export class AddPatientFinancialEntryUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, financialEntry }: AddPatientFinancialEntryInput) {
    return this.repository.addFinancialEntry(user, id, financialEntry);
  }
}
