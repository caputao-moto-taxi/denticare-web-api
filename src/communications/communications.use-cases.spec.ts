import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CommunicationsRepository } from './domain/communications.repository';
import { CommunicationDeliveryGateway } from './application/communication-delivery.gateway';
import { GetPatientMarketingConsentUseCase } from './application/useCases/get-patient-marketing-consent/get-patient-marketing-consent-use-case';
import { ListCampaignAudienceUseCase } from './application/useCases/list-campaign-audience/list-campaign-audience-use-case';
import { SendCampaignUseCase } from './application/useCases/send-campaign/send-campaign-use-case';
import { UpdatePatientMarketingConsentUseCase } from './application/useCases/update-patient-marketing-consent/update-patient-marketing-consent-use-case';

describe('Communications use cases', () => {
  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };

  it('limits audience to consented patients with valid channel contacts', async () => {
    const repository = {
      listAudience: jest.fn().mockResolvedValue([
        {
          id: 'patient-1',
          firstName: 'Ana',
          lastName: 'Costa',
          email: 'ana@example.test',
          phoneNumber: null,
        },
        {
          id: 'patient-2',
          firstName: 'Invalid',
          lastName: 'Email',
          email: 'not-an-email',
          phoneNumber: null,
        },
      ]),
    };
    const useCase = new ListCampaignAudienceUseCase(
      repository as unknown as CommunicationsRepository,
    );

    await expect(useCase.execute(admin, 'EMAIL', ' Ana ')).resolves.toEqual([
      { id: 'patient-1', name: 'Ana Costa', contact: 'ana@example.test' },
    ]);
    expect(repository.listAudience).toHaveBeenCalledWith(
      'branch-1',
      'EMAIL',
      'Ana',
    );
  });

  it('rejects campaign access for non-administrators before repository access', async () => {
    const repository = { listAudience: jest.fn() };
    const useCase = new ListCampaignAudienceUseCase(
      repository as unknown as CommunicationsRepository,
    );

    await expect(
      useCase.execute({ ...admin, role: 'doctor' }, 'SMS'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.listAudience).not.toHaveBeenCalled();
  });

  it('returns consent for the patient linked to the authenticated user', async () => {
    const repository = {
      findPatientConsent: jest.fn().mockResolvedValue({
        id: 'patient-1',
        marketingEmailConsent: true,
        marketingEmailConsentUpdatedAt: null,
        marketingSmsConsent: false,
        marketingSmsConsentUpdatedAt: null,
      }),
    };
    const useCase = new GetPatientMarketingConsentUseCase(
      repository as unknown as CommunicationsRepository,
    );

    await expect(
      useCase.execute({ ...admin, role: 'patient' }),
    ).resolves.toEqual({
      marketingEmailConsent: true,
      marketingEmailConsentUpdatedAt: null,
      marketingSmsConsent: false,
      marketingSmsConsentUpdatedAt: null,
    });
    expect(repository.findPatientConsent).toHaveBeenCalledWith(
      'admin-1',
      'branch-1',
    );
  });

  it('rejects consent access for non-patients before repository access', async () => {
    const repository = { findPatientConsent: jest.fn() };
    const useCase = new GetPatientMarketingConsentUseCase(
      repository as unknown as CommunicationsRepository,
    );

    await expect(useCase.execute(admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findPatientConsent).not.toHaveBeenCalled();
  });

  it('persists partial delivery counts from SMS results', async () => {
    const repository = {
      findCampaignRecipients: jest.fn().mockResolvedValue([
        { id: 'patient-1', email: null, phoneNumber: '923000001' },
        { id: 'patient-2', email: null, phoneNumber: '923000002' },
      ]),
      createCampaign: jest.fn().mockResolvedValue({ id: 'campaign-1' }),
      updateCampaignResult: jest.fn().mockResolvedValue({
        id: 'campaign-1',
        status: 'PARTIAL',
        sentCount: 1,
        failedCount: 1,
      }),
    };
    const delivery = {
      sendSmsBatch: jest.fn().mockResolvedValue([true, false]),
    };
    const useCase = new SendCampaignUseCase(
      repository as unknown as CommunicationsRepository,
      delivery as unknown as CommunicationDeliveryGateway,
    );

    await expect(
      useCase.execute(admin, {
        name: 'Recall SMS',
        channel: 'SMS',
        body: ' Recall ',
        recipientIds: ['patient-1', 'patient-2'],
      }),
    ).resolves.toMatchObject({
      status: 'PARTIAL',
      sentCount: 1,
      failedCount: 1,
    });
    expect(delivery.sendSmsBatch).toHaveBeenCalledWith(
      ['+244923000001', '+244923000002'],
      'Recall',
    );
    expect(repository.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch-1',
        createdById: 'admin-1',
        recipientCount: 2,
      }),
    );
  });

  it('rejects duplicate recipients before creating a campaign', async () => {
    const repository = {
      findCampaignRecipients: jest.fn(),
      createCampaign: jest.fn(),
    };
    const delivery = { sendEmail: jest.fn(), sendSmsBatch: jest.fn() };
    const useCase = new SendCampaignUseCase(
      repository as unknown as CommunicationsRepository,
      delivery as unknown as CommunicationDeliveryGateway,
    );

    await expect(
      useCase.execute(admin, {
        name: 'Recall',
        channel: 'SMS',
        body: 'Message',
        recipientIds: ['patient-1', 'patient-1'],
      }),
    ).rejects.toThrow('Duplicate recipients are not allowed');
    expect(repository.findCampaignRecipients).not.toHaveBeenCalled();
    expect(repository.createCampaign).not.toHaveBeenCalled();
  });

  it('timestamps only consent values that changed', async () => {
    const emailDate = new Date('2026-10-01T10:00:00.000Z');
    const repository = {
      findPatientConsent: jest.fn().mockResolvedValue({
        id: 'patient-1',
        marketingEmailConsent: true,
        marketingEmailConsentUpdatedAt: emailDate,
        marketingSmsConsent: false,
        marketingSmsConsentUpdatedAt: null,
      }),
      updatePatientConsent: jest.fn().mockImplementation((_id, input) => input),
    };
    const useCase = new UpdatePatientMarketingConsentUseCase(
      repository as unknown as CommunicationsRepository,
    );

    await useCase.execute(
      { ...admin, role: 'patient' },
      { marketingEmailConsent: true, marketingSmsConsent: true },
    );

    expect(repository.updatePatientConsent).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({
        marketingEmailConsentUpdatedAt: emailDate,
        marketingSmsConsentUpdatedAt: expect.any(Date),
      }),
    );
  });
});
