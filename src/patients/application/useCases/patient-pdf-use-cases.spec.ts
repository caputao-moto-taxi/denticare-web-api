import { NotFoundException } from '@nestjs/common';
import { AuthUser } from '../../../auth/auth-user';
import {
  PatientChartPdfData,
  IPatientRepository,
} from '../../domain/patient.repository';
import { IPatientPdfGenerator } from '../interfaces/patient-pdf-generator.interface';
import { GetPatientFinancialPdfUseCase } from './get-patient-financial-pdf/get-patient-financial-pdf-use-case';
import { GetPatientPrescriptionPdfUseCase } from './get-patient-prescription-pdf/get-patient-prescription-pdf-use-case';

describe('Patient PDF use cases', () => {
  const user: AuthUser = {
    id: 'staff-1',
    email: 'staff@example.test',
    role: 'doctor',
    branchId: 'branch-1',
  };
  const chart = {
    name: 'Ana Silva',
    recordNumber: '#PAC-2026-12345678',
    phone: '123',
    email: 'ana@example.test',
    address: 'Rua Central',
    birthDate: '2000-01-01',
    age: 26,
    idNumber: 'ID-1',
    nif: 'NIF-1',
    prescriptions: [{ id: 'prescription-1', items: [] }],
    financials: [{ id: 'financial-1', amount: '100 Kz' }],
  } as unknown as PatientChartPdfData;

  it('selects and projects the requested prescription in the use case', async () => {
    const repository = {
      getPatientChartPdfData: jest.fn().mockResolvedValue(chart),
    } as unknown as IPatientRepository;
    const generator = {
      createPrescription: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    } as unknown as IPatientPdfGenerator;
    const useCase = new GetPatientPrescriptionPdfUseCase(repository, generator);

    await useCase.execute({
      user,
      id: 'patient-1',
      prescriptionId: 'prescription-1',
    });

    expect(generator.createPrescription).toHaveBeenCalledWith({
      patient: expect.objectContaining({
        name: chart.name,
        recordNumber: chart.recordNumber,
        birthDate: chart.birthDate,
      }),
      prescription: chart.prescriptions[0],
    });
  });

  it('rejects prescription and financial PDF requests for records outside the visible chart', async () => {
    const repository = {
      getPatientChartPdfData: jest.fn().mockResolvedValue(chart),
    } as unknown as IPatientRepository;
    const generator = {
      createPrescription: jest.fn(),
      createFinancialReceipt: jest.fn(),
    } as unknown as IPatientPdfGenerator;
    const prescriptionUseCase = new GetPatientPrescriptionPdfUseCase(
      repository,
      generator,
    );
    const financialUseCase = new GetPatientFinancialPdfUseCase(
      repository,
      generator,
    );

    await expect(
      prescriptionUseCase.execute({
        user,
        id: 'patient-1',
        prescriptionId: 'missing',
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      financialUseCase.execute({
        user,
        id: 'patient-1',
        financialId: 'missing',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(generator.createPrescription).not.toHaveBeenCalled();
    expect(generator.createFinancialReceipt).not.toHaveBeenCalled();
  });
});
