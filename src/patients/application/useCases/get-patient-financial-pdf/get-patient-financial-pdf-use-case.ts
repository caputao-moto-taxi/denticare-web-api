import { NotFoundException } from '@nestjs/common';
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
    const chart = await this.repository.getPatientChartPdfData(user, id);
    const financial = chart.financials.find(
      (entry) => entry.id === financialId,
    );
    if (!financial) {
      throw new NotFoundException('Patient financial entry not found');
    }
    const data = {
      patient: {
        name: chart.name,
        recordNumber: chart.recordNumber,
        phone: chart.phone,
        email: chart.email,
        address: chart.address,
        idNumber: chart.idNumber,
        nif: chart.nif,
      },
      financial,
    };
    return this.pdfGenerator.createFinancialReceipt(data);
  }
}
