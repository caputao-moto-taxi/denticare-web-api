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
    const data = await this.repository.getPrescriptionPdfData(
      user,
      id,
      prescriptionId,
    );
    return this.pdfGenerator.createPrescription(data);
  }
}
