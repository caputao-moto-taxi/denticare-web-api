import {
  PatientChartPdfData,
  PatientFinancialPdfData,
  PatientPrescriptionPdfData,
} from '../../domain/patient.repository';

export interface IPatientPdfGenerator {
  createPatientChart(data: PatientChartPdfData): Promise<Buffer>;
  createPrescription(data: PatientPrescriptionPdfData): Promise<Buffer>;
  createFinancialReceipt(data: PatientFinancialPdfData): Promise<Buffer>;
}
