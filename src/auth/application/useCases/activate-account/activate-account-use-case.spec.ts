import { BadRequestException } from '@nestjs/common';
import {
  AuthProfileRecord,
  IAuthRepository,
} from '../../../domain/auth.repository';
import { SendMailServiceUseCase } from '../../../../shared/infra/services/sendEmailNotification.service';
import { ActivateAccountUseCase } from './activate-account-use-case';

describe('ActivateAccountUseCase', () => {
  const activationToken = 'valid-activation-token';
  const action = {
    id: 'action-id',
    userId: 'user-id',
    type: 'ACTIVATION',
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const account: AuthProfileRecord = {
    id: 'user-id',
    email: 'user@example.com',
    branchId: null,
    isActive: true,
    deletedAt: null,
    Role: null,
    UserPermission: [],
    Person: [
      {
        firstName: 'Ana',
        lastName: 'Silva',
        phoneNumber: null,
        avatar: null,
      },
    ],
    branch: null,
  };

  function createUseCase(mailResult: true | object = true) {
    let transactionCommitted = false;
    const transaction = {
      claimAuthActionToken: jest.fn().mockResolvedValue(1),
      activateUser: jest.fn().mockResolvedValue(undefined),
      findClinicHeadquarterId: jest.fn().mockResolvedValue(null),
      markUnusedAuthActionTokensUsed: jest.fn().mockResolvedValue(undefined),
    };
    const repository = {
      findAuthActionToken: jest.fn().mockResolvedValue(action),
      findUserProfile: jest.fn().mockResolvedValue(account),
      transaction: jest.fn(
        async (
          operation: (repository: IAuthRepository) => Promise<unknown>,
        ) => {
          const result = await operation(
            transaction as unknown as IAuthRepository,
          );
          transactionCommitted = true;
          return result;
        },
      ),
    } as unknown as IAuthRepository;
    const sendMailService = {
      execute: jest.fn().mockImplementation(async () => {
        expect(transactionCommitted).toBe(true);
        return mailResult;
      }),
    } as unknown as SendMailServiceUseCase;

    return {
      useCase: new ActivateAccountUseCase(repository, sendMailService),
      repository,
      transaction,
      sendMailService,
    };
  }

  it('sends a welcome email after the account activation is committed', async () => {
    const { useCase, sendMailService } = createUseCase();

    await useCase.execute(activationToken);

    expect(sendMailService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        to: account.email,
        subject: 'Bem-vindo à DentCare',
        html: expect.stringContaining('Olá Ana Silva,'),
      }),
    );
  });

  it('keeps activation successful when welcome email delivery fails', async () => {
    const { useCase } = createUseCase({ error: 'SMTP unavailable' });

    await expect(useCase.execute(activationToken)).resolves.toBeUndefined();
  });

  it('keeps activation successful if the account profile cannot be loaded', async () => {
    const { useCase, repository, sendMailService } = createUseCase();
    jest
      .spyOn(repository, 'findUserProfile')
      .mockRejectedValueOnce(new Error('Profile lookup failed'));

    await expect(useCase.execute(activationToken)).resolves.toBeUndefined();
    expect(sendMailService.execute).not.toHaveBeenCalled();
  });

  it('does not send a welcome email for an invalid activation token', async () => {
    const { useCase, repository, sendMailService } = createUseCase();
    jest.spyOn(repository, 'findAuthActionToken').mockResolvedValueOnce(null);

    await expect(useCase.execute(activationToken)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sendMailService.execute).not.toHaveBeenCalled();
  });
});
