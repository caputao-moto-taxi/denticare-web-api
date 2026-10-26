import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';
import { AddPatientFinancialEntryUseCase } from './add-patient-financial-entry-use-case';

const staff: AuthUser = {
  id: 'staff-1',
  email: 'staff@example.test',
  role: 'admin',
  branchId: 'branch-1',
  permissions: [],
};

describe('AddPatientFinancialEntryUseCase', () => {
  it('creates the reference and formats the persisted result', async () => {
    const repository = {
      addFinancialEntry: jest.fn().mockImplementation(
        async (_user, _patientId, input, entryId, reference) => ({
          id: entryId,
          reference,
          description: input.description,
          amount: input.amount,
          method: input.method,
          createdAt: new Date('2026-10-26T09:00:00.000Z'),
          status: 'pending',
        }),
      ),
    };
    const useCase = new AddPatientFinancialEntryUseCase(
      repository as unknown as IPatientRepository,
    );

    const result = await useCase.execute({
      user: staff,
      id: 'patient-1',
      financialEntry: {
        description: '  Consulta  ',
        amount: 12500,
        method: 'Dinheiro',
      },
    });

    expect(repository.addFinancialEntry).toHaveBeenCalledWith(
      staff,
      'patient-1',
      { description: 'Consulta', amount: 12500, method: 'Dinheiro' },
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      expect.stringMatching(/^REG-[0-9A-F]{8}$/),
    );
    expect(result).toMatchObject({
      description: 'Consulta',
      amount: '12 500 Kz',
      method: 'Dinheiro',
      date: '2026-10-26T09:00:00.000Z',
      status: 'pending',
    });
  });
});