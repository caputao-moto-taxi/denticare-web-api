import { AuthUser } from '../../../../auth/auth-user';
import {
  IPatientRepository,
  PatientExamCommand,
} from '../../../domain/patient.repository';

export type AddPatientExamInput = {
  user: AuthUser;
  id: string;
  exam: PatientExamCommand;
};

export class AddPatientExamUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, exam }: AddPatientExamInput) {
    return this.repository.addExam(user, id, exam);
  }
}
