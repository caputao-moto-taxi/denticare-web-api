import { AuthUser } from '../../../../auth/auth-user';
import { UpdatePatientToothUseCase } from './update-patient-tooth-use-case';

describe('UpdatePatientToothUseCase', () => {
  it('trims optional fields and converts empty values to null', async () => {
    const user = {
      id: 'doctor-1',
      role: 'doctor',
      permissions: ['patients.clinical.write'],
    } as unknown as AuthUser;
    const repository = {
      updateTooth: jest.fn().mockResolvedValue({}),
    };
    const useCase = new UpdatePatientToothUseCase(repository as never);

    await useCase.execute({
      user,
      id: 'patient-1',
      tooth: {
        number: 11,
        state: 'treated',
        procedureDone: ' Cleaning ',
        notes: '   ',
      },
    });

    expect(repository.updateTooth).toHaveBeenCalledWith(user, 'patient-1', {
      number: 11,
      state: 'treated',
      procedureDone: 'Cleaning',
      notes: null,
    });
  });
});
