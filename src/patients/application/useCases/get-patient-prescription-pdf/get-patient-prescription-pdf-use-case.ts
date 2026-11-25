import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IPatientPdfGenerator } from '../../interfaces/patient-pdf-generator.interface';
import { IPatientRepository } from '../../../domain/patient.repository';

export type GetPatientPrescriptionPdfInput = {
  user: AuthUser;
  id: string;
  prescriptionId: string;
};

export class GetPatientPrescriptionPdfUseCase {
  constructor(
    private readonly repository: IPatientRepository,
    private readonly pdfGenerator: IPatientPdfGenerator,
  ) {}

  async execute({ user, id, prescriptionId }: GetPatientPrescriptionPdfInput) {
    const chart = await this.repository.getPatientChartPdfData(user, id);
    const prescription = chart.prescriptions.find(
      (item) => item.id === prescriptionId,
    );
    if (!prescription) {
      throw new NotFoundException('Patient prescription not found');
    }
    const data = {
      patient: {
        name: chart.name,
        recordNumber: chart.recordNumber,
        phone: chart.phone,
        email: chart.email,
        address: chart.address,
        birthDate: chart.birthDate,
        age: chart.age,
        idNumber: chart.idNumber,
        nif: chart.nif,
      },
      prescription,
    };
    return this.pdfGenerator.createPrescription(data);
  }
}
