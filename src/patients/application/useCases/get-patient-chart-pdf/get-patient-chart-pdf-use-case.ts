import { AuthUser } from '../../../../auth/auth-user';
import { IPatientPdfGenerator } from '../../interfaces/patient-pdf-generator.interface';
import { IPatientRepository } from '../../../domain/patient.repository';

export type GetPatientChartPdfInput = { user: AuthUser; id: string };

export class GetPatientChartPdfUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly pdfGenerator: IPatientPdfGenerator,
  ) {}

  async execute({ user, id }: GetPatientChartPdfInput) {
    const data = await this.repository.getPatientChartPdfData(user, id);
    return this.pdfGenerator.createPatientChart(data);
  }
}
