import { BadRequestException } from '@nestjs/common';
import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';
import { AddPatientPrescriptionUseCase } from './add-patient-prescription-use-case';

const doctor: AuthUser = {
  id: 'doctor-1',
  email: 'doctor@example.test',
  role: 'doctor',
  branchId: 'branch-1',
  permissions: ['patients.clinical.write'],
};

describe('AddPatientPrescriptionUseCase', () => {
  const repository = { addPrescription: jest.fn() };
  const useCase = new AddPatientPrescriptionUseCase(
    repository as unknown as IPatientRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('normalizes prescription items and maps the persisted records', async () => {
    repository.addPrescription.mockImplementation(
      async (_user, _patientId, input, groupId) =>
        input.items.map((item) => ({
          id: 'prescription-1',
          ...item,
          createdAt: new Date('2026-10-26T09:00:00.000Z'),
          doctor: { username: 'Dr. Ana' },
          groupId,
        })),
    );

    const result = await useCase.execute({
      user: doctor,
      id: 'patient-1',
      prescription: {
        items: [
          {
            medication: '  Amoxicilina ',
            dosage: ' 500 mg ',
            instructions: ' 8 em 8 horas ',
            duration: ' 7 dias ',
          },
        ],
      },
    });

    expect(repository.addPrescription).toHaveBeenCalledWith(
      doctor,
      'patient-1',
      {
        items: [
          {
            medication: 'Amoxicilina',
            dosage: '500 mg',
            instructions: '8 em 8 horas',
            duration: '7 dias',
          },
        ],
      },
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(result).toMatchObject({
      prescribedBy: 'Dr. Ana',
      date: '2026-10-26T09:00:00.000Z',
      status: 'active',
    });
  });

  it('rejects an empty prescription before persistence', async () => {
    await expect(
      useCase.execute({ user: doctor, id: 'patient-1', prescription: { items: [] } }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.addPrescription).not.toHaveBeenCalled();
  });
});