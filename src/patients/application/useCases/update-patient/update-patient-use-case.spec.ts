import { AuthUser } from '../../../../auth/auth-user';
import { IPatientRepository } from '../../../domain/patient.repository';
import { UpdatePatientUseCase } from './update-patient-use-case';

describe('UpdatePatientUseCase consent timestamps', () => {
  const user: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const previous = {
    dataProcessingConsent: false,
    dataProcessingConsentUpdatedAt: null,
    marketingEmailConsent: true,
    marketingEmailConsentUpdatedAt: new Date('2025-01-01T00:00:00.000Z'),
    marketingSmsConsent: false,
    marketingSmsConsentUpdatedAt: null,
  };

  it('updates timestamps only for consent values that change', async () => {
    const repository = {
      emailExists: jest.fn().mockResolvedValue(false),
      getConsentState: jest.fn().mockResolvedValue(previous),
      update: jest.fn().mockResolvedValue({ id: 'patient-1' }),
    } as unknown as IPatientRepository;
    const useCase = new UpdatePatientUseCase(repository);
    const before = Date.now();

    await useCase.execute({
      user,
      id: 'patient-1',
      changes: {
        dataProcessingConsent: true,
        marketingEmailConsent: true,
        marketingSmsConsent: true,
      },
    });

    const [, , persisted] = (repository.update as jest.Mock).mock.calls[0];
    expect(
      persisted.dataProcessingConsentUpdatedAt.getTime(),
    ).toBeGreaterThanOrEqual(before);
    expect(persisted.marketingEmailConsentUpdatedAt).toEqual(
      previous.marketingEmailConsentUpdatedAt,
    );
    expect(
      persisted.marketingSmsConsentUpdatedAt.getTime(),
    ).toBeGreaterThanOrEqual(before);
  });
});
