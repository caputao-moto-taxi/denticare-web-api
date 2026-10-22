import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../shared/infra/db/prisma/prisma.service';
import { FinancesService } from './finances.service';

describe('FinancesService', () => {
  const user: AuthUser = {
    id: 'user-a',
    email: 'staff@example.test',
    role: 'admin',
    branchId: 'branch-a',
  };

  const entry = {
    id: 'entry-1',
    reference: 'REG-ENTRY-1',
    description: 'Consulta',
    amount: 1000,
    method: 'Dinheiro',
    status: 'paid',
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    patient: { firstName: 'Ana', lastName: 'Silva' },
  };

  const sale = {
    id: 'sale-1',
    customerName: 'Bento',
    paymentMethod: 'cash',
    total: 500,
    createdAt: new Date('2026-01-12T12:00:00.000Z'),
  };

  function createService() {
    const prisma = {
      patientFinancialEntry: { findMany: jest.fn().mockResolvedValue([entry]) },
      stockSale: { findMany: jest.fn().mockResolvedValue([sale]) },
    } as unknown as PrismaService;
    return { service: new FinancesService(prisma), prisma };
  }

  it('aggregates recorded revenue by branch and reports unavailable expenses truthfully', async () => {
    const { service, prisma } = createService();

    const result = await service.summary(user, {});

    expect(result).toMatchObject({
      income: 1500,
      received: 1500,
      pending: 0,
      currentBalance: 1500,
      totalExpenses: null,
      expensesAvailable: false,
    });
    expect(result.distributions.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'patient', count: 1, amount: 1000 }),
        expect.objectContaining({ value: 'stock', count: 1, amount: 500 }),
      ]),
    );
    expect(prisma.patientFinancialEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ branchId: 'branch-a', deletedAt: null }),
      }),
    );
    expect(prisma.stockSale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ branchId: 'branch-a' }),
      }),
    );
  });

  it('filters and paginates movements on the backend', async () => {
    const { service } = createService();

    const result = await service.movements(user, {
      source: 'patient',
      search: 'ana',
      page: 1,
      pageSize: 10,
    });

    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      patientName: 'Ana Silva',
      source: 'patient',
      amount: 1000,
    });
  });
});
