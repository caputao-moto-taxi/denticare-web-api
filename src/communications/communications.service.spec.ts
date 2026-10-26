import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { CommunicationDeliveryService } from './communication-delivery.service';
import { CommunicationsService } from './communications.service';

describe('CommunicationsService', () => {
  const admin: AuthUser = {
    id: 'admin-1',
    email: 'admin@example.test',
    role: 'admin',
    branchId: 'branch-1',
  };
  const person = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const communicationCampaign = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const delivery = {
    sendEmail: jest.fn(),
    sendSmsBatch: jest.fn(),
  };
  const service = new CommunicationsService(
    { person, communicationCampaign } as unknown as PrismaService,
    delivery as unknown as CommunicationDeliveryService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('limits the audience to active patients in the caller branch with valid contacts', async () => {
    person.findMany.mockResolvedValue([
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
    ]);

    await expect(service.listAudience(admin, 'EMAIL')).resolves.toEqual([
      {
        id: 'patient-1',
        name: 'Ana Costa',
        contact: 'ana@example.test',
      },
    ]);
    expect(person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          branchId: 'branch-1',
          isActive: true,
          Role: { slug: 'patient' },
          marketingEmailConsent: true,
        }),
        take: 500,
      }),
    );
  });

  it('returns consent only for the patient linked to the current user', async () => {
    person.findFirst.mockResolvedValue({
      id: 'patient-1',
      marketingEmailConsent: true,
      marketingEmailConsentUpdatedAt: new Date('2026-10-01T10:00:00Z'),
      marketingSmsConsent: false,
      marketingSmsConsentUpdatedAt: null,
    });

    await expect(
      service.getMyMarketingConsent({ ...admin, role: 'patient' }),
    ).resolves.toMatchObject({
      marketingEmailConsent: true,
      marketingSmsConsent: false,
    });
    expect(person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'admin-1',
          branchId: 'branch-1',
          deletedAt: null,
          Role: { slug: 'patient' },
        },
      }),
    );
  });

  it('allows only patients to change their own consents', async () => {
    await expect(
      service.getMyMarketingConsent(admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(person.findFirst).not.toHaveBeenCalled();
  });

  it('updates channel consent and records the change time', async () => {
    person.findFirst.mockResolvedValue({
      id: 'patient-1',
      marketingEmailConsent: false,
      marketingEmailConsentUpdatedAt: null,
      marketingSmsConsent: false,
      marketingSmsConsentUpdatedAt: null,
    });
    person.update.mockImplementation(({ data }) => ({
      marketingEmailConsent: data.marketingEmailConsent,
      marketingEmailConsentUpdatedAt: data.marketingEmailConsentUpdatedAt,
      marketingSmsConsent: data.marketingSmsConsent,
      marketingSmsConsentUpdatedAt: data.marketingSmsConsentUpdatedAt,
    }));

    await expect(
      service.updateMyMarketingConsent(
        { ...admin, role: 'patient' },
        { marketingEmailConsent: true, marketingSmsConsent: false },
      ),
    ).resolves.toMatchObject({
      marketingEmailConsent: true,
      marketingSmsConsent: false,
      marketingEmailConsentUpdatedAt: expect.any(Date),
    });
    expect(person.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1' },
        data: expect.objectContaining({
          marketingEmailConsent: true,
          marketingSmsConsent: false,
          marketingEmailConsentUpdatedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('normalizes Angola phone numbers before sending SMS campaigns', async () => {
    person.findMany.mockResolvedValue([
      { id: 'patient-1', email: null, phoneNumber: '923000001' },
      { id: 'patient-2', email: null, phoneNumber: '244923000002' },
    ]);
    communicationCampaign.create.mockResolvedValue({ id: 'campaign-1' });
    delivery.sendSmsBatch.mockResolvedValue([true, true]);
    communicationCampaign.update.mockResolvedValue({
      id: 'campaign-1',
      status: 'SENT',
      sentCount: 2,
      failedCount: 0,
    });

    await service.sendCampaign(admin, {
      name: 'Recall SMS',
      channel: 'SMS',
      body: 'A clínica tem uma vaga amanhã.',
      recipientIds: ['patient-1', 'patient-2'],
    });

    expect(delivery.sendSmsBatch).toHaveBeenCalledWith(
      ['+244923000001', '+244923000002'],
      'A clínica tem uma vaga amanhã.',
    );
  });

  it('records per-recipient SMS delivery counts for the caller branch', async () => {
    person.findMany.mockResolvedValue([
      { id: 'patient-1', email: null, phoneNumber: '+244923000001' },
      { id: 'patient-2', email: null, phoneNumber: '+244923000002' },
    ]);
    communicationCampaign.create.mockResolvedValue({ id: 'campaign-1' });
    delivery.sendSmsBatch.mockResolvedValue([true, false]);
    communicationCampaign.update.mockResolvedValue({
      id: 'campaign-1',
      status: 'PARTIAL',
      sentCount: 1,
      failedCount: 1,
    });

    await expect(
      service.sendCampaign(admin, {
        name: 'Summer offer',
        channel: 'SMS',
        body: 'A clinic offer',
        recipientIds: ['patient-1', 'patient-2'],
      }),
    ).resolves.toMatchObject({
      status: 'PARTIAL',
      sentCount: 1,
      failedCount: 1,
    });

    expect(person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['patient-1', 'patient-2'] },
          branchId: 'branch-1',
          isActive: true,
          Role: { slug: 'patient' },
          marketingSmsConsent: true,
        }),
      }),
    );
    expect(communicationCampaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          branchId: 'branch-1',
          createdById: 'admin-1',
          recipientCount: 2,
        }),
      }),
    );
    expect(communicationCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'campaign-1' },
        data: expect.objectContaining({
          status: 'PARTIAL',
          sentCount: 1,
          failedCount: 1,
        }),
      }),
    );
  });

  it('does not allow staff members to manage campaigns', async () => {
    await expect(
      service.listCampaigns({ ...admin, role: 'doctor' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(communicationCampaign.findMany).not.toHaveBeenCalled();
  });
});
