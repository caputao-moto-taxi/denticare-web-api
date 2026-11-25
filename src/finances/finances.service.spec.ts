import { AuthUser } from '../auth/auth-user';
import {
  FinanceMovement,
  IFinancesRepository,
} from './domain/finances.repository';
import type { FinanceQueryDto } from './finance-query.dto';
import { FinancesUseCases } from './application/finances.use-cases';

describe('FinancesUseCases', () => {
  const user: AuthUser = {
    id: 'user-a',
    email: 'staff@example.test',
    role: 'admin',
    branchId: 'branch-a',
  };

  const records: FinanceMovement[] = [
    {
      id: 'entry-1',
      reference: 'REG-ENTRY-1',
      description: 'Consulta',
      patientName: 'Ana Silva',
      source: 'patient',
      amount: 1000,
      method: 'Dinheiro',
      status: 'paid',
      date: '2026-01-10T12:00:00.000Z',
    },
    {
      id: 'sale-1',
      reference: 'SALE-1',
      description: 'Venda de artigo de stock',
      patientName: 'Bento',
      source: 'stock',
      amount: 500,
      method: 'cash',
      status: 'paid',
      date: '2026-01-12T12:00:00.000Z',
    },
  ];

  function createUseCases() {
    const repository = {
      movements: jest.fn().mockResolvedValue(records),
    } as unknown as IFinancesRepository;
    return { useCases: new FinancesUseCases(repository), repository };
  }

  it('aggregates recorded revenue and reports unavailable expenses truthfully', async () => {
    const { useCases, repository } = createUseCases();
    const result = await useCases.summary(user, {
      page: 1,
      pageSize: 10,
    } as FinanceQueryDto);
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
    expect(repository.movements).toHaveBeenCalledWith(
      'branch-a',
      expect.objectContaining({ page: 1, pageSize: 10 }),
    );
  });

  it('filters and paginates movements in the application layer', async () => {
    const { useCases } = createUseCases();
    const result = await useCases.movements(user, {
      source: 'patient',
      search: 'ana',
      page: 1,
      pageSize: 10,
    } as FinanceQueryDto);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(result.data).toMatchObject([
      { patientName: 'Ana Silva', source: 'patient', amount: 1000 },
    ]);
  });
});
