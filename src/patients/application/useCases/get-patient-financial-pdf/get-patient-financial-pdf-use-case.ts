import { AuthUser } from '../../../../auth/auth-user';
import { IPatientPdfGenerator } from '../../interfaces/patient-pdf-generator.interface';
import { IPatientRepository } from '../../../domain/patient.repository';

export type GetPatientFinancialPdfInput = {
  user: AuthUser;
  id: string;
  financialId: string;
};

export class GetPatientFinancialPdfUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly pdfGenerator: IPatientPdfGenerator,
  ) {}

  async execute({ user, id, financialId }: GetPatientFinancialPdfInput) {
    const data = await this.repository.getFinancialPdfData(
      user,
      id,
      financialId,
    );
    return this.pdfGenerator.createFinancialReceipt(data);
  }
}
