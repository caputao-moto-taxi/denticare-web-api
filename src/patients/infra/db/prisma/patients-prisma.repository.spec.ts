import { PatientsPrismaRepository } from './patients-prisma.repository';
import { PrismaService } from '../../../../shared/infra/db/prisma/prisma.service';

describe('PatientsPrismaRepository data processing consent', () => {
  const existingPatient = {
    id: 'patient-1',
    addressId: 'address-1',
    email: null,
    userId: null,
    dataProcessingConsent: false,
    dataProcessingConsentUpdatedAt: null,
    marketingEmailConsent: false,
    marketingEmailConsentUpdatedAt: null,
    marketingSmsConsent: false,
    marketingSmsConsentUpdatedAt: null,
  };
  const transaction = {
    address: { update: jest.fn() },
    person: { update: jest.fn() },
  };
  const prisma = {
    person: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const repository = new PatientsPrismaRepository(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.person.findFirst.mockResolvedValue(existingPatient);
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    transaction.person.update.mockImplementation(({ data }) => ({
      id: existingPatient.id,
      firstName: 'Ana',
      lastName: 'Costa',
      email: null,
      phoneNumber: null,
      birthDate: null,
      gender: 'FEMALE',
      medicalNotes: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      avatar: null,
      address: { street: 'Rua Central' },
      ...data,
    }));
  });

  it('persists all consent changes and returns their timestamps', async () => {
    const patient = await repository.update(
      {
        id: 'admin-1',
        email: 'admin@example.test',
        role: 'admin',
        branchId: 'branch-1',
        permissions: ['patients.contacts.read'],
      },
      existingPatient.id,
      {
        dataProcessingConsent: true,
        marketingEmailConsent: true,
        marketingSmsConsent: true,
      },
    );

    const updateData = transaction.person.update.mock.calls[0][0].data;
    expect(updateData.dataProcessingConsent).toBe(true);
    expect(updateData.dataProcessingConsentUpdatedAt).toEqual(expect.any(Date));
    expect(updateData.marketingEmailConsent).toBe(true);
    expect(updateData.marketingEmailConsentUpdatedAt).toEqual(expect.any(Date));
    expect(updateData.marketingSmsConsent).toBe(true);
    expect(updateData.marketingSmsConsentUpdatedAt).toEqual(expect.any(Date));
    expect(patient).toMatchObject({
      dataProcessingConsent: true,
      dataProcessingConsentUpdatedAt:
        updateData.dataProcessingConsentUpdatedAt.toISOString(),
      marketingEmailConsent: true,
      marketingEmailConsentUpdatedAt:
        updateData.marketingEmailConsentUpdatedAt.toISOString(),
      marketingSmsConsent: true,
      marketingSmsConsentUpdatedAt:
        updateData.marketingSmsConsentUpdatedAt.toISOString(),
    });
  });
});
