import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';

export type GetPatientExamFileInput = {
  user: AuthUser;
  id: string;
  examId: string;
};

export class GetPatientExamFileUseCase {
  constructor(private readonly repository: IPatientRepository) {}

  execute({ user, id, examId }: GetPatientExamFileInput) {
    return this.repository.getExamFile(user, id, examId);
  }
}
