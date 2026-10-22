import { AuthUser } from '../../../../auth/auth-user';
import { IPatientPdfGenerator } from '../../interfaces/patient-pdf-generator.interface';
import { IPatientRepository } from '../../../domain/patient.repository';
import { GetPatientChartPdfUseCase } from './get-patient-chart-pdf-use-case';

describe('GetPatientChartPdfUseCase', () => {
  const user: AuthUser = {
    id: 'staff-1',
    email: 'staff@example.test',
    role: 'doctor',
    branchId: 'branch-1',
  };
  const chart = { id: 'patient-1' };
  const pdf = Buffer.from('pdf');
  const repository = { getPatientChartPdfData: jest.fn() };
  const pdfGenerator = { createPatientChart: jest.fn() };
  const useCase = new GetPatientChartPdfUseCase(
    repository as unknown as IPatientRepository,
    pdfGenerator as unknown as IPatientPdfGenerator,
  );

  it('loads chart data and delegates PDF generation', async () => {
    repository.getPatientChartPdfData.mockResolvedValue(chart);
    pdfGenerator.createPatientChart.mockResolvedValue(pdf);

    await expect(useCase.execute({ user, id: 'patient-1' })).resolves.toBe(pdf);
    expect(repository.getPatientChartPdfData).toHaveBeenCalledWith(
      user,
      'patient-1',
    );
    expect(pdfGenerator.createPatientChart).toHaveBeenCalledWith(chart);
  });
});
